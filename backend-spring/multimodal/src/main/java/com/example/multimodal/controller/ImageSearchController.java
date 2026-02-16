package com.example.multimodal.controller;

import com.example.multimodal.dto.ProductDTO;
import com.example.multimodal.service.SearchService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
public class ImageSearchController {

    private final SearchService searchService;

    public ImageSearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @PostMapping(value = "/image-search", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.OK)
    public List<ProductDTO> searchProductsByImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(name = "topN", defaultValue = "10") int topN
    ) {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Uploaded image is empty");
        }
        if (topN <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "topN must be greater than 0");
        }
        try {
            return searchService.searchProductsByImage(file, topN);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage(), e);
        }
    }
}
