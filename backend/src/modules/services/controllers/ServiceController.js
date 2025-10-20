import SchedulingService from '../../scheduling/services/SchedulingService.js';

function getProviderId(req, res) {
  const providerId = req.user?.sub;

  if (!providerId) {
    res.status(401).json({ message: 'Unauthorized' });
    return null;
  }

  return providerId;
}

function handleServiceConflict(error, res) {
  if (
    error?.code === 'SERVICE_UNIQUE_CONSTRAINT' ||
    error?.code === 'P2002'
  ) {
    return res.status(409).json({ message: 'Ja existe um servico com esses dados.' });
  }

  return null;
}

class ServiceController {
  async list(req, res) {
    const providerId = getProviderId(req, res);
    if (!providerId) {
      return;
    }

    try {
      const services = await SchedulingService.listServices(providerId);
      return res.status(200).json({ services });
    } catch (error) {
      console.error('Failed to list services:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async create(req, res) {
    const providerId = getProviderId(req, res);
    if (!providerId) {
      return;
    }

    try {
      const payload = req.body ?? {};
      const service = await SchedulingService.createService(providerId, payload);
      return res.status(201).json({ service });
    } catch (error) {
      const handled = handleServiceConflict(error, res);
      if (handled) {
        return handled;
      }

      console.error('Failed to create service:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async update(req, res) {
    const providerId = getProviderId(req, res);
    if (!providerId) {
      return;
    }

    const serviceId = req.params?.id;

    try {
      const payload = req.body ?? {};
      const service = await SchedulingService.updateService(providerId, serviceId, payload);

      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }

      return res.status(200).json({ service });
    } catch (error) {
      const handled = handleServiceConflict(error, res);
      if (handled) {
        return handled;
      }

      console.error('Failed to update service:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async remove(req, res) {
    const providerId = getProviderId(req, res);
    if (!providerId) {
      return;
    }

    const serviceId = req.params?.id;

    try {
      const removed = await SchedulingService.deleteService(providerId, serviceId);

      if (!removed) {
        return res.status(404).json({ message: 'Service not found' });
      }

      return res.status(204).send();
    } catch (error) {
      console.error('Failed to delete service:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}

export default new ServiceController();
