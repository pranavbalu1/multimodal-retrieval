package com.example.multimodal.controller;

import com.example.multimodal.dto.ProductDTO;
import com.example.multimodal.service.SearchService;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @QueryMapping
    public List<ProductDTO> searchProducts(@Argument String query, @Argument int topN) {
        return searchService.searchProducts(query, topN);
    }
}
