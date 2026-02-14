package com.example.multimodal.repository;

import com.example.multimodal.dto.ProductDTO;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class ProductRepository {

    private final JdbcTemplate jdbcTemplate;

    public ProductRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<ProductDTO> searchByEmbedding(List<Double> embedding, int topN) {
        try {
            System.out.println("Embedding size: " + embedding.size());

            // Convert list to string literal suitable for pgvector
            String vectorLiteral = embedding.toString(); // e.g., "[0.1, 0.2, 0.3]"

            String sql = """
                SELECT 
                    id,
                    productdisplayname,
                    mastercategory,
                    subcategory,
                    basecolour,
                    1 - (embedding <-> ?::vector) AS similarity
                FROM products
                ORDER BY embedding <-> ?::vector
                LIMIT ?
            """;

            return jdbcTemplate.query(
                sql,
                new Object[]{vectorLiteral, vectorLiteral, topN},
                (rs, rowNum) -> new ProductDTO(
                        rs.getLong("id"),
                        rs.getString("productdisplayname"),
                        rs.getString("mastercategory"),
                        rs.getString("subcategory"),
                        rs.getString("basecolour"),
                        rs.getDouble("similarity")
                )
            );

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Vector search failed", e);
        }
    }
}
