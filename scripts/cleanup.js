const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require('../trans-it-4b9e4-firebase-adminsdk-fbsvc-ebb85ebf7b.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'trans-it-4b9e4.appspot.com'
});

const bucket = admin.storage().bucket();
const FOLDER_NAME = 'boarding_photos/';
const RETENTION_DAYS = 7;

async function cleanupOldPhotos() {
    console.log(`Starting cleanup for folder: ${FOLDER_NAME}`);
    console.log(`Retention period: ${RETENTION_DAYS} days`);

    const [files] = await bucket.getFiles({ prefix: FOLDER_NAME });
    const now = Date.now();
    let deletedCount = 0;

    for (const file of files) {
        if (file.name === FOLDER_NAME) continue; // Skip folder itself

        // Get metadata
        const [metadata] = await file.getMetadata();
        const createdTime = new Date(metadata.timeCreated).getTime();
        const diffDays = (now - createdTime) / (1000 * 60 * 60 * 24);

        if (diffDays > RETENTION_DAYS) {
            console.log(`Deleting ${file.name} (Age: ${diffDays.toFixed(1)} days)`);
            await file.delete();
            deletedCount++;
        }
    }

    console.log(`Cleanup complete. Deleted ${deletedCount} files.`);
}

cleanupOldPhotos().catch(console.error);
