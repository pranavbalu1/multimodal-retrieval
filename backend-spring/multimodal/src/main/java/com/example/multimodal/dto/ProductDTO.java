package com.example.multimodal.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ProductDTO {
    private Long id;
    private String productDisplayName;
    private String masterCategory;
    private String subCategory;
    private String baseColour;
    private Double similarity;
}
