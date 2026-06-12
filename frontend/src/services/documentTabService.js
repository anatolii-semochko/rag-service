import {categoriesService, collectionsService, documentsService} from "../api/services.js";


export class DocumentTabService {

    async fetchData(expandedCategories = new Set(), expandedCollections = new Set()) {
        try {
            // Fetch all categories (categories already include collections from server)
            const categoriesResponse = await categoriesService.getCategories();
            const categories = categoriesResponse.data || [];

            // Collect all collection IDs from categories and expanded categories
            const allCollectionIds = new Set();

            // Get collection IDs from categories that come with collections from server
            categories.forEach(category => {
                if (category.collections && category.collections.length > 0) {
                    category.collections.forEach(collection => {
                        allCollectionIds.add(collection.id);
                    });
                }
            });

            // Fetch collections for expanded categories ONLY if they don't have collections already
            const categoryCollections = {};
            for (const categoryId of expandedCategories) {
                const category = categories.find(cat => cat.id === categoryId);
                if (category && category.collections && category.collections.length > 0) {
                    categoryCollections[categoryId] = category.collections;
                } else {
                    try {
                        const collectionsResponse = await collectionsService.getCollectionsByCategory(categoryId);
                        const collections = collectionsResponse.data || [];
                        categoryCollections[categoryId] = collections;
                        collections.forEach(collection => {
                            allCollectionIds.add(collection.id);
                        });
                    } catch (error) {
                        categoryCollections[categoryId] = [];
                    }
                }
            }

            // Fetch ALL documents for ALL collections
            const collectionDocuments = {};

            for (const collectionId of allCollectionIds) {
                try {
                    const documentsResponse = await documentsService.getDocumentsByCollection(collectionId);
                    collectionDocuments[collectionId] = documentsResponse.data || [];
                } catch (error) {
                    collectionDocuments[collectionId] = [];
                }
            }

            return {
                categories,
                categoryCollections,
                collectionDocuments,
                expandedCategories,
                expandedCollections
            };

        } catch (error) {
            console.error('Error fetching document tab data:', error);
            throw error;
        }
    }

    precalculateData(
        categories,
        categoryCollections,
        collectionDocuments,
        expandedCategories,
        expandedCollections
    ) {
        return categories.map(category => {
            // Add calculated parameters for category
            const processedCategory = {
                ...category,
                isExpanded: expandedCategories.has(category.id),
                isDisabled: false, // categories cannot be disabled
                collections: []
            };

            // Get collections for this category
            // First try from expanded collections, then fallback to collections included with category data
            const collections = categoryCollections[category.id] || category.collections || [];

            processedCategory.collections = collections.map(collection => {
                // Add calculated parameters for collection
                const processedCollection = {
                    ...collection,
                    isExpanded: expandedCollections.has(collection.id),
                    isDisabled: !category.isActive, // collection disabled if category is inactive
                    documents: []
                };

                // Get documents for this collection
                const documents = collectionDocuments[collection.id] || [];

                processedCollection.documents = documents.map(file => {
                    // Add calculated parameters for document
                    return {
                        ...file,
                        isDisabled: !collection.isActive || !category.isActive, // document disabled if collection or category is inactive
                        filename: file.originalFilename || file.filename || file.title || 'Unknown file',
                        fileSize: file.fileSize || file.size,
                        mimeType: file.fileType || file.mimeType
                    };
                });

                return processedCollection;
            });

            return processedCategory;
        });
    }
}
