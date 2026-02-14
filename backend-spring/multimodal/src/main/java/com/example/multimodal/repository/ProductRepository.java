package com.example.multimodal.repository;

import com.example.multimodal.dto.ProductDTO;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Array;
import java.util.List;

@Repository
public class ProductRepository {

    private final JdbcTemplate jdbcTemplate;

    public ProductRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<ProductDTO> searchByEmbedding(List<Double> embedding, int topN) {

    try {

        // Convert embedding list to pgvector string format
        System.out.println("Embedding size: " + embedding.size());
        String vectorString = embedding.toString();  

        String sql = """
            SELECT id, productdisplayname, mastercategory, subcategory, basecolour
            FROM products
            ORDER BY embedding <-> ?::vector
            LIMIT ?
        """;

        return jdbcTemplate.query(
                sql,
                new Object[]{vectorString, topN},
                (rs, rowNum) -> new ProductDTO(
                        rs.getLong("id"),
                        rs.getString("productdisplayname"),
                        rs.getString("mastercategory"),
                        rs.getString("subcategory"),
                        rs.getString("basecolour")
                )
        );


    } catch (Exception e) {
        e.printStackTrace(); // important for debugging
        throw new RuntimeException("Vector search failed", e);
    }
}
}
