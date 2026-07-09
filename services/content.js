const { Content } = require('../models');
const s3Upload = require('./s3-upload');
const contentGrounding = require('../utils/content-grounding');

class ContentService {
  async createContent(user_id, content_data) {
    try {
      const content = new Content({
        ...content_data,
        author: user_id,
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        status: 'draft'
      });
      
      return await content.save();
    } catch (error) {
      throw new Error(`Failed to create content: ${error.message}`);
    }
  }

  async getContentById(content_id) {
    try {
      const content = await Content.findById(content_id)
        .populate('author', 'username email')
        .populate('organization');
      
      if (!content || !content.is_active) {
        return null;
      }
      
      return content;
    } catch (error) {
      throw new Error(`Failed to get content: ${error.message}`);
    }
  }

  async getPublishedContent(filters = {}) {
    try {
      const query = { status: 'published', is_active: true };
      
      if (filters.type) {
        query.type = filters.type;
      }
      
      if (filters.organization_id) {
        query.organization = filters.organization_id;
      }
      
      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }
      
      const content = await Content.find(query)
        .populate('author', 'username email')
        .populate('organization', 'name')
        .sort({ created_at: -1 })
        .limit(filters.limit || 50);
      
      return content;
    } catch (error) {
      throw new Error(`Failed to get published content: ${error.message}`);
    }
  }

  async searchContent(search_query, filters = {}) {
    try {
      const query = {
        $and: [
          { status: 'published', is_active: true },
          {
            $or: [
              { title: { $regex: search_query, $options: 'i' } },
              { description: { $regex: search_query, $options: 'i' } },
              { content: { $regex: search_query, $options: 'i' } },
              { tags: { $in: [new RegExp(search_query, 'i')] } }
            ]
          }
        ]
      };
      
      if (filters.type) {
        query.$and.push({ type: filters.type });
      }
      
      if (filters.organization_id) {
        query.$and.push({ organization: filters.organization_id });
      }
      
      const results = await Content.find(query)
        .populate('author', 'username email')
        .populate('organization', 'name')
        .sort({ created_at: -1 })
        .limit(filters.limit || 20);
      
      return results;
    } catch (error) {
      throw new Error(`Failed to search content: ${error.message}`);
    }
  }

  async updateContent(content_id, user_id, update_data) {
    try {
      const content = await Content.findById(content_id);
      
      if (!content || !content.is_active) {
        throw new Error('Content not found');
      }
      
      if (content.author.toString() !== user_id) {
        throw new Error('Unauthorized to update this content');
      }
      
      const updated_content = await Content.findByIdAndUpdate(
        content_id,
        { ...update_data, updated_at: new Date() },
        { new: true }
      ).populate('author', 'username email');
      
      return updated_content;
    } catch (error) {
      throw new Error(`Failed to update content: ${error.message}`);
    }
  }

  async publishContent(content_id, user_id) {
    try {
      const content = await Content.findById(content_id);
      
      if (!content || !content.is_active) {
        throw new Error('Content not found');
      }
      
      if (content.author.toString() !== user_id) {
        throw new Error('Unauthorized to publish this content');
      }
      
      // Apply content grounding before publishing
      const grounded_content = await contentGrounding.groundContent(content.content);
      
      const published_content = await Content.findByIdAndUpdate(
        content_id,
        { 
          status: 'published',
          content: grounded_content,
          published_at: new Date(),
          updated_at: new Date()
        },
        { new: true }
      ).populate('author', 'username email');
      
      return published_content;
    } catch (error) {
      throw new Error(`Failed to publish content: ${error.message}`);
    }
  }

  async unpublishContent(content_id, user_id) {
    try {
      const content = await Content.findById(content_id);
      
      if (!content || !content.is_active) {
        throw new Error('Content not found');
      }
      
      if (content.author.toString() !== user_id) {
        throw new Error('Unauthorized to unpublish this content');
      }
      
      const unpublished_content = await Content.findByIdAndUpdate(
        content_id,
        { 
          status: 'draft',
          updated_at: new Date()
        },
        { new: true }
      ).populate('author', 'username email');
      
      return unpublished_content;
    } catch (error) {
      throw new Error(`Failed to unpublish content: ${error.message}`);
    }
  }

  async uploadContentFile(file, user_id) {
    try {
      const upload_result = await s3Upload.uploadFile(file, {
        folder: 'content',
        user_id: user_id
      });
      
      return {
        file_url: upload_result.file_url,
        file_key: upload_result.file_key,
        file_name: upload_result.file_name,
        file_size: upload_result.file_size
      };
    } catch (error) {
      throw new Error(`Failed to upload content file: ${error.message}`);
    }
  }

  async deleteContent(content_id, user_id) {
    try {
      const content = await Content.findById(content_id);
      
      if (!content || !content.is_active) {
        throw new Error('Content not found');
      }
      
      if (content.author.toString() !== user_id) {
        throw new Error('Unauthorized to delete this content');
      }
      
      await Content.findByIdAndUpdate(
        content_id,
        { 
          is_active: false,
          deleted_at: new Date(),
          updated_at: new Date()
        }
      );
      
      return { message: 'Content deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete content: ${error.message}`);
    }
  }

  async addTagToContent(content_id, tag, user_id) {
    try {
      const content = await Content.findById(content_id);
      
      if (!content || !content.is_active) {
        throw new Error('Content not found');
      }
      
      if (content.author.toString() !== user_id) {
        throw new Error('Unauthorized to modify this content');
      }
      
      if (!content.tags.includes(tag)) {
        content.tags.push(tag);
        content.updated_at = new Date();
        await content.save();
      }
      
      return content;
    } catch (error) {
      throw new Error(`Failed to add tag: ${error.message}`);
    }
  }

  async removeTagFromContent(content_id, tag, user_id) {
    try {
      const content = await Content.findById(content_id);
      
      if (!content || !content.is_active) {
        throw new Error('Content not found');
      }
      
      if (content.author.toString() !== user_id) {
        throw new Error('Unauthorized to modify this content');
      }
      
      content.tags = content.tags.filter(t => t !== tag);
      content.updated_at = new Date();
      await content.save();
      
      return content;
    } catch (error) {
      throw new Error(`Failed to remove tag: ${error.message}`);
    }
  }
}

module.exports = new ContentService();