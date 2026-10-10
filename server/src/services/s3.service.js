const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const isS3Enabled = () => {
  return process.env.NODE_ENV === 'production' && Boolean(process.env.AWS_S3_BUCKET_NAME);
};

let s3ClientInstance = null;

const getS3Client = () => {
  if (!s3ClientInstance) {
    const config = {
      region: process.env.AWS_REGION || 'ap-south-1'
    };

    // If explicit AWS credentials exist in env, use them.
    // If not provided (ECS IAM Task Role), omit credentials so AWS SDK resolves them from ECS metadata automatically.
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      };
    }

    s3ClientInstance = new S3Client(config);
  }
  return s3ClientInstance;
};

const getS3BucketName = () => {
  return process.env.AWS_S3_BUCKET_NAME;
};

/**
 * Upload a Buffer or stream to S3
 */
const uploadBufferToS3 = async (buffer, key, contentType) => {
  const client = getS3Client();
  const cleanKey = key.replace(/^\/+/, '');
  const command = new PutObjectCommand({
    Bucket: getS3BucketName(),
    Key: cleanKey,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream'
  });
  return await client.send(command);
};

/**
 * Generate a presigned GET URL for an S3 object
 * Default expiration: 1 hour (3600 seconds)
 */
const getPresignedDownloadUrl = async (key, expiresIn = 3600) => {
  const client = getS3Client();
  const cleanKey = key.replace(/^\/+/, '');
  const command = new GetObjectCommand({
    Bucket: getS3BucketName(),
    Key: cleanKey
  });
  return await getSignedUrl(client, command, { expiresIn });
};

/**
 * Delete an object from S3
 */
const deleteFromS3 = async (key) => {
  const client = getS3Client();
  const cleanKey = key.replace(/^\/+/, '');
  const command = new DeleteObjectCommand({
    Bucket: getS3BucketName(),
    Key: cleanKey
  });
  return await client.send(command);
};

/**
 * Get S3 object stream for proxying directly through API
 */
const getS3ObjectStream = async (key) => {
  const client = getS3Client();
  const cleanKey = key.replace(/^\/+/, '');
  const command = new GetObjectCommand({
    Bucket: getS3BucketName(),
    Key: cleanKey
  });
  return await client.send(command);
};

module.exports = {
  isS3Enabled,
  getS3Client,
  getS3BucketName,
  uploadBufferToS3,
  getPresignedDownloadUrl,
  getS3ObjectStream,
  deleteFromS3
};
