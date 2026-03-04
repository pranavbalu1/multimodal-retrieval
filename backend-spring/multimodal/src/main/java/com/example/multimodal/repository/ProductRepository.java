package com.example.multimodal.repository;

import com.example.multimodal.dto.ProductDTO;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class ProductRepository {

    // Low-level SQL executor provided by Spring JDBC.
    private final JdbcTemplate jdbcTemplate;

    public ProductRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Query nearest products for a text embedding vector.
     */
    public List<ProductDTO> searchByEmbedding(List<Double> embedding, int topN) {
        try {
            System.out.println("Embedding size: " + embedding.size());

            // pgvector accepts array-like literal strings, e.g. [0.1, 0.2, ...].
            String vectorLiteral = embedding.toString();

            // Notes:
            // - `<->` returns vector distance (smaller = closer).
            // - We also expose similarity as `1 - distance` for UI readability.
            // - We pass vectorLiteral twice: once for projection, once for ORDER BY.
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

    /**
     * Query nearest products for an image embedding vector.
     */
    public List<ProductDTO> searchByImageEmbedding(List<Double> embedding, int topN) {
        try {
            System.out.println("Image embedding size: " + embedding.size());

            String vectorLiteral = embedding.toString();

            // Same retrieval pattern as text search, but on image_embedding column.
            // We filter null values to avoid distance operations on missing vectors.
            String sql = """
                SELECT
                    id,
                    productdisplayname,
                    mastercategory,
                    subcategory,
                    basecolour,
                    1 - (image_embedding <-> ?::vector) AS similarity
                FROM products
                WHERE image_embedding IS NOT NULL
                ORDER BY image_embedding <-> ?::vector
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
            throw new RuntimeException("Image vector search failed", e);
        }
    }
}
