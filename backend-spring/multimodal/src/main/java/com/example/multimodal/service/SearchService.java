package com.example.multimodal.service;

import com.example.multimodal.dto.ProductDTO;
import com.example.multimodal.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class SearchService {

    private final ProductRepository productRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    public SearchService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public List<ProductDTO> searchProducts(String query, int topN) {
        // Call Python embedding service
        Map<String, Object> response = restTemplate.postForObject(
                "http://localhost:8000/embed/text",
                Map.of("text", query),
                Map.class
        );

        List<Double> embedding = (List<Double>) response.get("embedding");

        // Query Postgres using embedding
        return productRepository.searchByEmbedding(embedding, topN);
    }
}
