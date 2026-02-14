package com.example.multimodal.service;

import com.example.multimodal.dto.ProductDTO;
import com.example.multimodal.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

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
}
