export const mockServicesData = [
  {
    id: 'svc-1',
    name: 'Corte masculino',
    duration: 45,
    price: 60,
  },
  {
    id: 'svc-2',
    name: 'Barba completa',
    duration: 30,
    price: 40,
  },
  {
    id: 'svc-3',
    name: 'Hidratação capilar',
    duration: 50,
    price: 75,
  },
];

export const mockBookingsData = [
  {
    id: 'bk-1',
    serviceId: 'svc-1',
    clientName: 'João Ferreira',
    dateTime: new Date().setHours(9, 0, 0, 0),
  },
  {
    id: 'bk-2',
    serviceId: 'svc-2',
    clientName: 'Marcos Lima',
    dateTime: new Date().setHours(10, 30, 0, 0),
  },
  {
    id: 'bk-3',
    serviceId: 'svc-3',
    clientName: 'Bruna Souza',
    dateTime: new Date().setHours(14, 0, 0, 0),
  },
];
