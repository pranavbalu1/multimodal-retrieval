package com.example.multimodal.controller;

import com.example.multimodal.dto.ProductDTO;
import com.example.multimodal.service.SearchService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
public class ImageSearchController {

    // Shared service used by both GraphQL text search and REST image search.
    private final SearchService searchService;

    public ImageSearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    /**
     * Multipart REST endpoint for image similarity search.
     *
     * Request fields:
     *   - file: uploaded image
     *   - topN: number of results to return (default 10)
     */
    @PostMapping(value = "/image-search", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.OK)
    public List<ProductDTO> searchProductsByImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(name = "topN", defaultValue = "10") int topN
    ) {
        // Guard rails: reject obviously invalid request payloads.
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Uploaded image is empty");
        }
        if (topN <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "topN must be greater than 0");
        }

        try {
            return searchService.searchProductsByImage(file, topN);
        } catch (RuntimeException e) {
            // Normalize service exceptions to an HTTP 500 with message.
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage(), e);
        }
    }
}
