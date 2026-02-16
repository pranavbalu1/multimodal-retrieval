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
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class SearchService {

    private static final Logger logger = LoggerFactory.getLogger(SearchService.class);
    private static final long SLOW_SEARCH_THRESHOLD_MS = 500; // warning threshold

    private final ProductRepository productRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    public SearchService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public List<ProductDTO> searchProducts(String query, int topN) {
        long totalStart = System.currentTimeMillis();

        logger.info("Search request received: query='{}', topN={}", query, topN);

        // 1️⃣ Call Python embedding service
        long embedStart = System.currentTimeMillis();
        Map<String, Object> response = restTemplate.postForObject(
                "http://localhost:8000/embed/text",
                Map.of("text", query),
                Map.class
        );
        long embedTime = System.currentTimeMillis() - embedStart;

        List<Double> embedding = (List<Double>) response.get("embedding");
        logger.info("Embedding retrieved (size={}): {} ms", embedding.size(), embedTime);

        // 2️⃣ Query Postgres using embedding
        long dbStart = System.currentTimeMillis();
        List<ProductDTO> results = productRepository.searchByEmbedding(embedding, topN);
        long dbTime = System.currentTimeMillis() - dbStart;
        logger.info("Database query time: {} ms, results returned: {}", dbTime, results.size());

        // 3️⃣ Total request time
        long totalTime = System.currentTimeMillis() - totalStart;

        if (totalTime > SLOW_SEARCH_THRESHOLD_MS) {
            logger.warn("Slow search detected: query='{}', totalTime={} ms", query, totalTime);
        } else {
            logger.info("Total search request time: {} ms", totalTime);
        }

        return results;
    }

    public List<ProductDTO> searchProductsByImage(MultipartFile imageFile, int topN) {
        long totalStart = System.currentTimeMillis();
        logger.info("Image search request received: filename='{}', topN={}", imageFile.getOriginalFilename(), topN);

        long embedStart = System.currentTimeMillis();
        List<Double> embedding = getImageEmbedding(imageFile);
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

    private List<Double> getImageEmbedding(MultipartFile imageFile) {
        try {
            ByteArrayResource fileResource = new ByteArrayResource(imageFile.getBytes()) {
                @Override
                public String getFilename() {
                    return imageFile.getOriginalFilename() != null ? imageFile.getOriginalFilename() : "upload.jpg";
                }
            };

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            HttpHeaders partHeaders = new HttpHeaders();
            String contentType = imageFile.getContentType();
            if (contentType != null && !contentType.isBlank()) {
                partHeaders.setContentType(MediaType.parseMediaType(contentType));
            } else {
                partHeaders.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            }
            HttpEntity<ByteArrayResource> filePart = new HttpEntity<>(fileResource, partHeaders);
            body.add("file", filePart);

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

            return parseEmbedding(responseBody.get("embedding"));
        } catch (RestClientResponseException e) {
            String body = e.getResponseBodyAsString();
            throw new RuntimeException(
                    "Embedding service call failed with status " + e.getStatusCode().value() + ": " + body,
                    e
            );
        } catch (IOException e) {
            throw new RuntimeException("Failed to read uploaded image file", e);
        }
    }

    private List<Double> parseEmbedding(Object embeddingPayload) {
        if (!(embeddingPayload instanceof List<?> raw)) {
            throw new RuntimeException("Embedding payload is not a list");
        }

        List<Double> flattened = new ArrayList<>();
        flattenNumericValues(raw, flattened);
        return flattened;
    }

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
