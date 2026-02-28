package com.example.multimodal.service;

import com.example.multimodal.dto.ProductDTO;
import com.example.multimodal.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class SearchService {

    // Structured app logger used for observability and diagnostics.
    private static final Logger logger = LoggerFactory.getLogger(SearchService.class);

    // Simple latency threshold used to flag potentially slow requests.
    private static final long SLOW_SEARCH_THRESHOLD_MS = 500;

    // Repository executes pgvector SQL. RestTemplate talks to Python embedding API.
    private final ProductRepository productRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    public SearchService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    /**
     * Text search pipeline:
     *  1) Request text embedding from FastAPI
     *  2) Query Postgres vector index for nearest neighbors
     *  3) Return ranked products
     */
    public List<ProductDTO> searchProducts(String query, int topN) {
        long totalStart = System.currentTimeMillis();
        logger.info("Search request received: query='{}', topN={}", query, topN);

        // ------------------------------------------------------------------
        // Step 1: generate query embedding (Python service)
        // ------------------------------------------------------------------
        long embedStart = System.currentTimeMillis();
        Map<String, Object> response = restTemplate.postForObject(
                "http://localhost:8000/embed/text",
                Map.of("text", query),
                Map.class
        );
        long embedTime = System.currentTimeMillis() - embedStart;

        @SuppressWarnings("unchecked")
        List<Double> embedding = (List<Double>) response.get("embedding");
        logger.info("Embedding retrieved (size={}): {} ms", embedding.size(), embedTime);

        // ------------------------------------------------------------------
        // Step 2: nearest-neighbor lookup in Postgres (pgvector)
        // ------------------------------------------------------------------
        long dbStart = System.currentTimeMillis();
        List<ProductDTO> results = productRepository.searchByEmbedding(embedding, topN);
        long dbTime = System.currentTimeMillis() - dbStart;
        logger.info("Database query time: {} ms, results returned: {}", dbTime, results.size());

        // ------------------------------------------------------------------
        // Step 3: latency reporting
        // ------------------------------------------------------------------
        long totalTime = System.currentTimeMillis() - totalStart;
        if (totalTime > SLOW_SEARCH_THRESHOLD_MS) {
            logger.warn("Slow search detected: query='{}', totalTime={} ms", query, totalTime);
        } else {
            logger.info("Total search request time: {} ms", totalTime);
        }

        return results;
    }

    /**
     * Image search pipeline (same shape as text search, different embedding source):
     *  1) Send uploaded image to FastAPI /embed/image
     *  2) Validate expected embedding size (512)
     *  3) Query image_embedding vector column
     */
    public List<ProductDTO> searchProductsByImage(MultipartFile imageFile, int topN) {
        long totalStart = System.currentTimeMillis();
        logger.info("Image search request received: filename='{}', topN={}", imageFile.getOriginalFilename(), topN);

        long embedStart = System.currentTimeMillis();
        List<Double> embedding = getImageEmbedding(imageFile);

        // CLIP ViT-B/32 image feature size guard.
        if (embedding.size() != 512) {
            throw new RuntimeException(
                    "Image embedding must contain 512 values, but got " + embedding.size() +
                    ". Restart Python service and verify /embed/image output."
            );
        }

        long embedTime = System.currentTimeMillis() - embedStart;
        logger.info("Image embedding retrieved (size={}): {} ms", embedding.size(), embedTime);

        long dbStart = System.currentTimeMillis();
        List<ProductDTO> results = productRepository.searchByImageEmbedding(embedding, topN);
        long dbTime = System.currentTimeMillis() - dbStart;
        logger.info("Image database query time: {} ms, results returned: {}", dbTime, results.size());

        // Helpful warning when image embeddings were not ingested.
        if (results.isEmpty()) {
            logger.warn("Image search returned no rows. Verify products.image_embedding is populated.");
        }

        long totalTime = System.currentTimeMillis() - totalStart;
        if (totalTime > SLOW_SEARCH_THRESHOLD_MS) {
            logger.warn("Slow image search detected: filename='{}', totalTime={} ms", imageFile.getOriginalFilename(), totalTime);
        } else {
            logger.info("Total image search request time: {} ms", totalTime);
        }

        return results;
    }

    /**
     * Send multipart image upload to Python embedding service and return parsed vector.
     */
    private List<Double> getImageEmbedding(MultipartFile imageFile) {
        try {
            // Convert Spring MultipartFile into a Resource that RestTemplate can send.
            ByteArrayResource fileResource = new ByteArrayResource(imageFile.getBytes()) {
                @Override
                public String getFilename() {
                    return imageFile.getOriginalFilename() != null ? imageFile.getOriginalFilename() : "upload.jpg";
                }
            };

            // Build multipart body: field name must match FastAPI parameter (`file`).
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

            HttpHeaders partHeaders = new HttpHeaders();
            String contentType = imageFile.getContentType();
            if (contentType != null && !contentType.isBlank()) {
                partHeaders.setContentType(MediaType.parseMediaType(contentType));
            } else {
                // Fallback media type for clients that omit file MIME metadata.
                partHeaders.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            }
            HttpEntity<ByteArrayResource> filePart = new HttpEntity<>(fileResource, partHeaders);
            body.add("file", filePart);

            // Request-level headers for multipart submission.
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    "http://localhost:8000/embed/image",
                    requestEntity,
                    Map.class
            );

            Map<String, Object> responseBody = response.getBody();
            if (responseBody == null || !responseBody.containsKey("embedding")) {
                throw new RuntimeException("Embedding service returned no embedding");
            }

            // Parse and flatten payload in case service returns nested arrays.
            return parseEmbedding(responseBody.get("embedding"));

        } catch (RestClientResponseException e) {
            // Include downstream status/body for easier debugging.
            String body = e.getResponseBodyAsString();
            throw new RuntimeException(
                    "Embedding service call failed with status " + e.getStatusCode().value() + ": " + body,
                    e
            );
        } catch (IOException e) {
            throw new RuntimeException("Failed to read uploaded image file", e);
        }
    }

    /**
     * Convert generic deserialized JSON payload into a flat List<Double>.
     */
    private List<Double> parseEmbedding(Object embeddingPayload) {
        if (!(embeddingPayload instanceof List<?> raw)) {
            throw new RuntimeException("Embedding payload is not a list");
        }

        List<Double> flattened = new ArrayList<>();
        flattenNumericValues(raw, flattened);
        return flattened;
    }

    /**
     * Recursive helper that accepts mixed nesting depth and extracts numeric leaves.
     */
    private void flattenNumericValues(List<?> source, List<Double> target) {
        for (Object value : source) {
            if (value instanceof Number number) {
                target.add(number.doubleValue());
            } else if (value instanceof List<?> nested) {
                flattenNumericValues(nested, target);
            } else {
                throw new RuntimeException("Embedding payload contains non-numeric values");
            }
        }
    }
}
