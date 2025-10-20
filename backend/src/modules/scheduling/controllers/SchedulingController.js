import SchedulingService from '../services/SchedulingService.js';

function getProviderId(req, res) {
  const providerId = req.user?.sub;

  if (!providerId) {
    res.status(401).json({ message: 'Unauthorized' });
    return null;
  }

  return providerId;
}

function handleDomainError(error, res) {
  if (error?.code === 'CUSTOMER_NOT_FOUND') {
    return res.status(error.status ?? 404).json({ message: 'Cliente n\u00e3o encontrado.' });
  }

  if (error?.code === 'SERVICE_NOT_FOUND') {
    return res.status(error.status ?? 404).json({ message: 'Servi\u00e7o n\u00e3o encontrado.' });
  }

  if (error?.code === 'APPOINTMENT_NOT_FOUND') {
    return res.status(error.status ?? 404).json({ message: 'Agendamento n\u00e3o encontrado.' });
  }

  if (error?.code === 'VALIDATION_ERROR' && error.details) {
    return res.status(error.status ?? 400).json({
      message:
        error.message ??
        'N\u00e3o foi poss\u00edvel validar os dados informados. Verifique os campos e tente novamente.',
      details: error.details,
    });
  }

  if (error?.code === 'WORKING_HOUR_CONFLICT') {
    return res
      .status(error.status ?? 409)
      .json({ message: 'J\u00e1 existe um hor\u00e1rio cadastrado para este dia.' });
  }

  if (error?.code === 'WORKING_HOUR_INVALID_RANGE') {
    return res
      .status(error.status ?? 400)
      .json({ message: 'O hor\u00e1rio final deve ser maior que o inicial.' });
  }

  if (error?.code === 'WORKING_HOUR_INVALID_DAY') {
    return res
      .status(error.status ?? 400)
      .json({ message: 'Dia da semana inv\u00e1lido. Informe um valor entre 0 e 6.' });
  }

  if (error?.code === 'BLOCK_INVALID_RANGE') {
    return res
      .status(error.status ?? 400)
      .json({ message: 'A data/hora final do bloqueio deve ser maior que a inicial.' });
  }

  return null;
}

class SchedulingController {
  async overview(req, res) {
    const providerId = getProviderId(req, res);
    if (!providerId) {
      return;
    }

    try {
      const overview = await SchedulingService.getOverview(providerId);
      return res.status(200).json(overview);
    } catch (error) {
      console.error('Failed to load scheduling overview:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async listCustomers(req, res) {
    const providerId = getProviderId(req, res);
    if (!providerId) {
      return;
    }

    try {
      const customers = await SchedulingService.listCustomers(providerId);
      return res.status(200).json({ customers });
    } catch (error) {
      console.error('Failed to list customers:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async createCustomer(req, res) {
    const providerId = getProviderId(req, res);
    if (!providerId) {
      return;
    }

    try {
      const customer = await SchedulingService.createCustomer(providerId, req.body);
      return res.status(201).json({ customer });
    } catch (error) {
      console.error('Failed to create customer:', error);
      const handled = handleDomainError(error, res);
      if (handled) {
        return handled;
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async listServices(req, res) {
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

  async createService(req, res) {
    const providerId = getProviderId(req, res);
    if (!providerId) {
      return;
    }

    try {
      const service = await SchedulingService.createService(providerId, req.body);
      return res.status(201).json({ service });
    } catch (error) {
      console.error('Failed to create service:', error);
      const handled = handleDomainError(error, res);
      if (handled) {
        return handled;
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async listWorkingHours(req, res) {
    const providerId = getProviderId(req, res);
    if (!providerId) {
      return;
    }

    try {
      const workingHours = await SchedulingService.listWorkingHours(providerId);
      return res.status(200).json({ workingHours });
    } catch (error) {
      console.error('Failed to list working hours:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async createWorkingHour(req, res) {
    const providerId = getProviderId(req, res);
    if (!providerId) {
      return;
    }

    try {
      const workingHour = await SchedulingService.createWorkingHour(providerId, req.body);
      return res.status(201).json({ workingHour });
    } catch (error) {
      console.error('Failed to create working hour:', error);
      const handled = handleDomainError(error, res);
      if (handled) {
        return handled;
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async updateWorkingHour(req, res) {
    const providerId = getProviderId(req, res);
    if (!providerId) {
      return;
    }

    const workingHourId = req.params?.id;

    try {
      const workingHour = await SchedulingService.updateWorkingHour(
        providerId,
        workingHourId,
        req.body,
      );

      if (!workingHour) {
        return res.status(404).json({ message: 'Working hour not found' });
      }

      return res.status(200).json({ workingHour });
    } catch (error) {
      console.error('Failed to update working hour:', error);
      const handled = handleDomainError(error, res);
      if (handled) {
        return handled;
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async removeWorkingHour(req, res) {
    const providerId = getProviderId(req, res);
    if (!providerId) {
      return;
    }

    const workingHourId = req.params?.id;

    try {
      const removed = await SchedulingService.deleteWorkingHour(providerId, workingHourId);

      if (!removed) {
        return res.status(404).json({ message: 'Working hour not found' });
      }

      return res.status(204).send();
    } catch (error) {
      console.error('Failed to delete working hour:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async createBlock(req, res) {
    const providerId = getProviderId(req, res);
    if (!providerId) {
      return;
    }

    try {
      const block = await SchedulingService.createBlock(providerId, req.body);
      return res.status(201).json({ block });
    } catch (error) {
      console.error('Failed to create block:', error);
      const handled = handleDomainError(error, res);
      if (handled) {
        return handled;
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async listBlocks(req, res) {
    const providerId = getProviderId(req, res);
    if (!providerId) {
      return;
    }

    try {
      const blocks = await SchedulingService.listBlocks(providerId);
      return res.status(200).json({ blocks });
    } catch (error) {
      console.error('Failed to list blocks:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async removeBlock(req, res) {
    const providerId = getProviderId(req, res);
    if (!providerId) {
      return;
    }

    const blockId = req.params?.id;

    try {
      const removed = await SchedulingService.deleteBlock(providerId, blockId);

      if (!removed) {
        return res.status(404).json({ message: 'Block not found' });
      }

      return res.status(204).send();
    } catch (error) {
      console.error('Failed to delete block:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async createAppointment(req, res) {
    const providerId = getProviderId(req, res);
    if (!providerId) {
      return;
    }

    try {
      const appointment = await SchedulingService.createAppointment(providerId, req.body);
      return res.status(201).json({ appointment });
    } catch (error) {
      console.error('Failed to create appointment:', error);
      const handled = handleDomainError(error, res);
      if (handled) {
        return handled;
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async listAppointments(req, res) {
    const providerId = getProviderId(req, res);
    if (!providerId) {
      return;
    }

    try {
      const appointments = await SchedulingService.listAppointments(providerId);
      return res.status(200).json({ appointments });
    } catch (error) {
      console.error('Failed to list appointments:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async recordPayment(req, res) {
    const providerId = getProviderId(req, res);
    if (!providerId) {
      return;
    }

    try {
      const payment = await SchedulingService.recordPayment(providerId, req.body);
      return res.status(201).json({ payment });
    } catch (error) {
      console.error('Failed to record payment:', error);
      const handled = handleDomainError(error, res);
      if (handled) {
        return handled;
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async listPayments(req, res) {
    const providerId = getProviderId(req, res);
    if (!providerId) {
      return;
    }

    try {
      const payments = await SchedulingService.listPayments(providerId);
      return res.status(200).json({ payments });
    } catch (error) {
      console.error('Failed to list payments:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}

export default new SchedulingController();
