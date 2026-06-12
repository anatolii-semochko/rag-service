import {categoriesService, collectionsService, documentsService} from "../api/services.js";


export class DocumentTabService {

    async fetchData(expandedCategories = new Set(), expandedCollections = new Set()) {
        try {
            // Fetch all categories
            const categoriesResponse = await categoriesService.getCategories();
            const categories = categoriesResponse.data || [];

            // Fetch collections for expanded categories
            const categoryCollections = {};
            for (const categoryId of expandedCategories) {
                try {
                    const collectionsResponse = await collectionsService.getCollectionsByCategory(categoryId);
                    categoryCollections[categoryId] = collectionsResponse.data || [];
                } catch (error) {
                    console.error(`Error fetching collections for category ${categoryId}:`, error);
                    categoryCollections[categoryId] = [];
                }
            }

            // Fetch files for expanded collections
            const collectionFiles = {};
            for (const collectionId of expandedCollections) {
                try {
                    const filesResponse = await documentsService.getDocumentsByCollection(collectionId);
                    collectionFiles[collectionId] = filesResponse.data || [];
                } catch (error) {
                    console.error(`Error fetching files for collection ${collectionId}:`, error);
                    collectionFiles[collectionId] = [];
                }
            }

            return {
                categories,
                categoryCollections,
                collectionFiles,
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
        collectionFiles,
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
            const collections = categoryCollections[category.id] || [];

            processedCategory.collections = collections.map(collection => {
                // Add calculated parameters for collection
                const processedCollection = {
                    ...collection,
                    isExpanded: expandedCollections.has(collection.id),
                    isDisabled: !category.isActive, // collection disabled if category is inactive
                    documents: []
                };

                // Get files for this collection
                const files = collectionFiles[collection.id] || [];

                processedCollection.documents = files.map(file => {
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
