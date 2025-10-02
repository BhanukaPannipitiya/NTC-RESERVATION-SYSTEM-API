const routeService = require('../services/routeService');
const logger = require('../utils/logger');

/**
 * Routes Controller - HTTP request handling for route endpoints
 */
class RoutesController {
  constructor() {
    this.routeService = routeService;
  }

  init(db) {
    this.routeService.init(db);
  }

  async getAllRoutes(req, res) {
    try {
      const { query } = req;
      const result = await this.routeService.getAllRoutes(query);

      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        'X-Total-Count': result.pagination.total,
        'X-Page': result.pagination.page,
        'X-Limit': result.pagination.limit,
        'X-Total-Pages': result.pagination.pages,
      });

      const links = {
        self: { href: `/v1/routes?page=${query.page}&limit=${query.limit}`, method: 'GET' },
      };

      if (result.pagination.page > 1) {
        links.prev = { href: `/v1/routes?page=${result.pagination.page - 1}&limit=${query.limit}`, method: 'GET' };
      }
      if (result.pagination.page < result.pagination.pages) {
        links.next = { href: `/v1/routes?page=${result.pagination.page + 1}&limit=${query.limit}`, method: 'GET' };
      }

      res.status(200).json({
        message: 'Routes retrieved successfully',
        data: result.data,
        pagination: result.pagination,
        links,
      });
    } catch (error) {
      logger.error('Get all routes controller error', error);
      res.status(error.status || 500).json({
        error: error.name || 'Routes Error',
        message: error.message || 'Failed to retrieve routes',
      });
    }
  }

  async getRouteById(req, res) {
    try {
      const { id } = req.params;
      const route = await this.routeService.getRouteById(parseInt(id, 10));

      if (!route) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Route not found',
        });
      }

      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        ETag: `"${route.id}-${route.updatedAt}"`,
      });

      const ifNoneMatch = req.headers['if-none-match'];
      if (ifNoneMatch && ifNoneMatch === `"${route.id}-${route.updatedAt}"`) {
        return res.status(304).end();
      }

      res.status(200).json({
        message: 'Route retrieved successfully',
        data: route,
        links: {
          self: { href: `/v1/routes/${route.id}`, method: 'GET' },
          update: { href: `/v1/routes/${route.id}`, method: 'PUT' },
          delete: { href: `/v1/routes/${route.id}`, method: 'DELETE' },
        },
      });
    } catch (error) {
      logger.error('Get route by ID controller error', error);
      res.status(error.status || 500).json({
        error: error.name || 'Route Error',
        message: error.message || 'Failed to retrieve route',
      });
    }
  }

  async createRoute(req, res) {
    try {
      const routeData = req.body;
      const newRoute = await this.routeService.createRoute(routeData);

      res.set({
        'Content-Type': 'application/json',
        Location: `/v1/routes/${newRoute.id}`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      });

      res.status(201).json({
        message: 'Route created successfully',
        data: newRoute,
        links: {
          self: { href: `/v1/routes/${newRoute.id}`, method: 'GET' },
          update: { href: `/v1/routes/${newRoute.id}`, method: 'PUT' },
          delete: { href: `/v1/routes/${newRoute.id}`, method: 'DELETE' },
        },
      });
    } catch (error) {
      logger.error('Create route controller error', error);
      res.status(error.status || 500).json({
        error: error.name || 'Route Creation Error',
        message: error.message || 'Failed to create route',
      });
    }
  }

  async updateRoute(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedRoute = await this.routeService.updateRoute(parseInt(id, 10), updateData);

      if (!updatedRoute) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Route not found',
        });
      }

      res.set({
        'Content-Type': 'application/json',
        Location: `/v1/routes/${updatedRoute.id}`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Updated-At': updatedRoute.updatedAt,
      });

      res.status(200).json({
        message: 'Route updated successfully',
        data: updatedRoute,
        links: {
          self: { href: `/v1/routes/${updatedRoute.id}`, method: 'GET' },
          update: { href: `/v1/routes/${updatedRoute.id}`, method: 'PUT' },
          delete: { href: `/v1/routes/${updatedRoute.id}`, method: 'DELETE' },
        },
      });
    } catch (error) {
      logger.error('Update route controller error', error);
      res.status(error.status || 500).json({
        error: error.name || 'Route Update Error',
        message: error.message || 'Failed to update route',
      });
    }
  }

  async deleteRoute(req, res) {
    try {
      const { id } = req.params;
      const deleted = await this.routeService.deleteRoute(parseInt(id, 10));

      if (!deleted) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Route not found',
        });
      }

      res.status(204).end();
    } catch (error) {
      logger.error('Delete route controller error', error);
      res.status(error.status || 500).json({
        error: error.name || 'Route Deletion Error',
        message: error.message || 'Failed to delete route',
      });
    }
  }
}

const routesController = new RoutesController();
module.exports = routesController;
