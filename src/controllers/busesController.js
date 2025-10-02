const busService = require('../services/busService');
const logger = require('../utils/logger');

/**
 * Buses Controller - HTTP request handling for bus endpoints
 */
class BusesController {
  constructor() {
    this.busService = busService;
  }

  init(db) {
    this.busService.init(db);
  }

  async getAllBuses(req, res) {
    try {
      const { query } = req;
      const result = await this.busService.getAllBuses(query);

      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        'X-Total-Count': result.pagination.total,
        'X-Page': result.pagination.page,
        'X-Limit': result.pagination.limit,
        'X-Total-Pages': result.pagination.pages,
      });

      const links = {
        self: { href: `/v1/buses?page=${query.page}&limit=${query.limit}`, method: 'GET' },
      };

      if (result.pagination.page > 1) {
        links.prev = { href: `/v1/buses?page=${result.pagination.page - 1}&limit=${query.limit}`, method: 'GET' };
      }
      if (result.pagination.page < result.pagination.pages) {
        links.next = { href: `/v1/buses?page=${result.pagination.page + 1}&limit=${query.limit}`, method: 'GET' };
      }

      res.status(200).json({
        message: 'Buses retrieved successfully',
        data: result.data,
        pagination: result.pagination,
        links,
      });
    } catch (error) {
      logger.error('Get all buses controller error', error);
      res.status(error.status || 500).json({
        error: error.name || 'Buses Error',
        message: error.message || 'Failed to retrieve buses',
      });
    }
  }

  async getBusById(req, res) {
    try {
      const { id } = req.params;
      const bus = await this.busService.getBusById(parseInt(id, 10));

      if (!bus) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Bus not found',
        });
      }

      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        ETag: `"${bus.id}-${bus.updatedAt}"`,
      });

      const ifNoneMatch = req.headers['if-none-match'];
      if (ifNoneMatch && ifNoneMatch === `"${bus.id}-${bus.updatedAt}"`) {
        return res.status(304).end();
      }

      res.status(200).json({
        message: 'Bus retrieved successfully',
        data: bus,
        links: {
          self: { href: `/v1/buses/${bus.id}`, method: 'GET' },
          update: { href: `/v1/buses/${bus.id}`, method: 'PUT' },
          delete: { href: `/v1/buses/${bus.id}`, method: 'DELETE' },
        },
      });
    } catch (error) {
      logger.error('Get bus by ID controller error', error);
      res.status(error.status || 500).json({
        error: error.name || 'Bus Error',
        message: error.message || 'Failed to retrieve bus',
      });
    }
  }

  async createBus(req, res) {
    try {
      const busData = req.body;
      const newBus = await this.busService.createBus(busData);

      res.set({
        'Content-Type': 'application/json',
        Location: `/v1/buses/${newBus.id}`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      });

      res.status(201).json({
        message: 'Bus created successfully',
        data: newBus,
        links: {
          self: { href: `/v1/buses/${newBus.id}`, method: 'GET' },
          update: { href: `/v1/buses/${newBus.id}`, method: 'PUT' },
          delete: { href: `/v1/buses/${newBus.id}`, method: 'DELETE' },
        },
      });
    } catch (error) {
      logger.error('Create bus controller error', error);
      res.status(error.status || 500).json({
        error: error.name || 'Bus Creation Error',
        message: error.message || 'Failed to create bus',
      });
    }
  }

  async updateBus(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedBus = await this.busService.updateBus(parseInt(id, 10), updateData);

      if (!updatedBus) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Bus not found',
        });
      }

      res.set({
        'Content-Type': 'application/json',
        Location: `/v1/buses/${updatedBus.id}`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Updated-At': updatedBus.updatedAt,
      });

      res.status(200).json({
        message: 'Bus updated successfully',
        data: updatedBus,
        links: {
          self: { href: `/v1/buses/${updatedBus.id}`, method: 'GET' },
          update: { href: `/v1/buses/${updatedBus.id}`, method: 'PUT' },
          delete: { href: `/v1/buses/${updatedBus.id}`, method: 'DELETE' },
        },
      });
    } catch (error) {
      logger.error('Update bus controller error', error);
      res.status(error.status || 500).json({
        error: error.name || 'Bus Update Error',
        message: error.message || 'Failed to update bus',
      });
    }
  }

  async deleteBus(req, res) {
    try {
      const { id } = req.params;
      const deleted = await this.busService.deleteBus(parseInt(id, 10));

      if (!deleted) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Bus not found',
        });
      }

      res.status(204).end();
    } catch (error) {
      logger.error('Delete bus controller error', error);
      res.status(error.status || 500).json({
        error: error.name || 'Bus Deletion Error',
        message: error.message || 'Failed to delete bus',
      });
    }
  }
}

const busesController = new BusesController();
module.exports = busesController;
