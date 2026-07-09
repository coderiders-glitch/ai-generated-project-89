const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const crypto = require('crypto');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const bucket_name = process.env.S3_BUCKET_NAME;

if (!bucket_name) {
  throw new Error('S3_BUCKET_NAME environment variable is required');
}

class S3UploadService {
  constructor() {
    this.s3 = s3;
    this.bucket_name = bucket_name;
  }

  generateFileKey(original_name, folder = '', user_id = null) {
    const timestamp = Date.now();
    const random_string = crypto.randomBytes(8).toString('hex');
    const file_extension = path.extname(original_name);
    const base_name = path.basename(original_name, file_extension);
    
    let file_key = `${timestamp}-${random_string}-${base_name}${file_extension}`;
    
    if (folder) {
      file_key = `${folder}/${file_key}`;
    }
    
    if (user_id) {
      file_key = `users/${user_id}/${file_key}`;
    }
    
    return file_key;
  }

  async uploadFile(file, options = {}) {
    try {
      const { folder = '', user_id = null, acl = 'public-read' } = options;
      
      if (!file) {
        throw new Error('File is required');
      }
      
      const file_key = this.generateFileKey(file.originalname, folder, user_id);
      
      const upload_params = {
        Bucket: this.bucket_name,
        Key: file_key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: acl,
        Metadata: {
          'original-name': file.originalname,
          'upload-timestamp': Date.now().toString()
        }
      };
      
      if (user_id) {
        upload_params.Metadata['user-id'] = user_id.toString();
      }
      
      const upload_result = await this.s3.upload(upload_params).promise();
      
      return {
        file_url: upload_result.Location,
        file_key: upload_result.Key,
        file_name: file.originalname,
        file_size: file.size,
        content_type: file.mimetype,
        bucket: this.bucket_name
      };
    } catch (error) {
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }

  async uploadBuffer(buffer, file_name, content_type, options = {}) {
    try {
      const { folder = '', user_id = null, acl = 'public-read' } = options;
      
      const file_key = this.generateFileKey(file_name, folder, user_id);
      
      const upload_params = {
        Bucket: this.bucket_name,
        Key: file_key,
        Body: buffer,
        ContentType: content_type,
        ACL: acl,
        Metadata: {
          'original-name': file_name,
          'upload-timestamp': Date.now().toString()
        }
      };
      
      if (user_id) {
        upload_params.Metadata['user-id'] = user_id.toString();
      }
      
      const upload_result = await this.s3.upload(upload_params).promise();
      
      return {
        file_url: upload_result.Location,
        file_key: upload_result.Key,
        file_name: file_name,
        file_size: buffer.length,
        content_type: content_type,
        bucket: this.bucket_name
      };
    } catch (error) {
      throw new Error(`S3 buffer upload failed: ${error.message}`);
    }
  }

  async deleteFile(file_key) {
    try {
      const delete_params = {
        Bucket: this.bucket_name,
        Key: file_key
      };
      
      await this.s3.deleteObject(delete_params).promise();
      
      return { message: 'File deleted successfully', file_key };
    } catch (error) {
      throw new Error(`S3 delete failed: ${error.message}`);
    }
  }

  async getFileUrl(file_key, expires_in = 3600) {
    try {
      const signed_url = this.s3.getSignedUrl('getObject', {
        Bucket: this.bucket_name,
        Key: file_key,
        Expires: expires_in
      });
      
      return signed_url;
    } catch (error) {
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  async listFiles(prefix = '', max_keys = 100) {
    try {
      const list_params = {
        Bucket: this.bucket_name,
        Prefix: prefix,
        MaxKeys: max_keys
      };
      
      const result = await this.s3.listObjectsV2(list_params).promise();
      
      return {
        files: result.Contents.map(file => ({
          file_key: file.Key,
          file_size: file.Size,
          last_modified: file.LastModified,
          etag: file.ETag
        })),
        is_truncated: result.IsTruncated,
        next_continuation_token: result.NextContinuationToken
      };
    } catch (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  getMulterConfig(options = {}) {
    const { folder = '', user_id = null, file_size_limit = 10 * 1024 * 1024 } = options;
    
    return multer({
      storage: multerS3({
        s3: this.s3,
        bucket: this.bucket_name,
        acl: 'public-read',
        key: (req, file, cb) => {
          const file_key = this.generateFileKey(file.originalname, folder, user_id);
          cb(null, file_key);
        },
        metadata: (req, file, cb) => {
          const metadata = {
            'original-name': file.originalname,
            'upload-timestamp': Date.now().toString()
          };
          
          if (user_id) {
            metadata['user-id'] = user_id.toString();
          }
          
          cb(null, metadata);
        }
      }),
      limits: {
        fileSize: file_size_limit
      },
      fileFilter: (req, file, cb) => {
        // Allow common file types
        const allowed_types = /jpeg|jpg|png|gif|pdf|doc|docx|txt|mp4|mp3|wav/;
        const ext_name = allowed_types.test(path.extname(file.originalname).toLowerCase());
        const mime_type = allowed_types.test(file.mimetype);
        
        if (ext_name && mime_type) {
          return cb(null, true);
        } else {
          cb(new Error('File type not allowed'));
        }
      }
    });
  }
}

module.exports = new S3UploadService();