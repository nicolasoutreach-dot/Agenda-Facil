import bcrypt from 'bcryptjs';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const demoEmail = 'demo-scheduling@agenda-facil.test';

  const hashedPassword = await bcrypt.hash(process.env.DEMO_USER_PASSWORD ?? 'demo123456', 10);

  const demoUser = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {
      name: 'Agenda Facil Demo',
      password: hashedPassword,
      nomeDoNegocio: 'Studio Agenda Facil',
      servicos: ['Corte feminino premium', 'Coloracao profissional'],
      onboardingIncompleto: false,
      politicaConfirmacao: 'automatica',
      phone: '+55 11 95555-0000',
      timezone: 'America/Sao_Paulo',
    },
    create: {
      email: demoEmail,
      name: 'Agenda Facil Demo',
      password: hashedPassword,
      nomeDoNegocio: 'Studio Agenda Facil',
      servicos: ['Corte feminino premium', 'Coloracao profissional'],
      horarios: {
        segunda: { inicio: '09:00', fim: '18:00' },
        terca: { inicio: '09:00', fim: '18:00' },
      },
      politicaConfirmacao: 'automatica',
      onboardingIncompleto: false,
      phone: '+55 11 95555-0000',
      timezone: 'America/Sao_Paulo',
    },
  });

  await prisma.$transaction([
    prisma.paymentRecord.deleteMany({ where: { providerId: demoUser.id } }),
    prisma.appointment.deleteMany({ where: { providerId: demoUser.id } }),
    prisma.block.deleteMany({ where: { providerId: demoUser.id } }),
    prisma.workingHours.deleteMany({ where: { providerId: demoUser.id } }),
    prisma.service.deleteMany({ where: { providerId: demoUser.id } }),
    prisma.customer.deleteMany({ where: { providerId: demoUser.id } }),
  ]);

  const [mariaCustomer, pedroCustomer] = await Promise.all([
    prisma.customer.create({
      data: {
        providerId: demoUser.id,
        name: 'Maria Souza',
        email: 'maria.scheduling@demo.test',
        phone: '+55 11 90000-0001',
        notes: 'Cliente recorrente, prefere atendimento pela manha.',
        tags: ['vip', 'coloracao'],
      },
    }),
    prisma.customer.create({
      data: {
        providerId: demoUser.id,
        name: 'Pedro Lima',
        email: 'pedro.scheduling@demo.test',
        phone: '+55 11 90000-0002',
        notes: 'Gosta de agendar no final da tarde.',
        tags: ['barba'],
      },
    }),
  ]);

  const [corteService, coloracaoService] = await Promise.all([
    prisma.service.create({
      data: {
        providerId: demoUser.id,
        name: 'Corte Premium',
        description: 'Corte personalizado com finalizacao profissional.',
        durationMinutes: 60,
        price: new Prisma.Decimal('150.00'),
        currency: 'BRL',
        isActive: true,
        bufferBefore: 10,
        bufferAfter: 10,
      },
    }),
    prisma.service.create({
      data: {
        providerId: demoUser.id,
        name: 'Coloracao Completa',
        description: 'Coloracao profissional com diagnostico incluso.',
        durationMinutes: 120,
        price: new Prisma.Decimal('320.00'),
        currency: 'BRL',
        isActive: true,
        bufferBefore: 15,
        bufferAfter: 15,
      },
    }),
  ]);

  const workingHoursData = [
    { dayOfWeek: 'monday', startMinutes: 9 * 60, endMinutes: 18 * 60 },
    { dayOfWeek: 'tuesday', startMinutes: 9 * 60, endMinutes: 18 * 60 },
    { dayOfWeek: 'wednesday', startMinutes: 11 * 60, endMinutes: 20 * 60 },
    { dayOfWeek: 'thursday', startMinutes: 9 * 60, endMinutes: 18 * 60 },
    { dayOfWeek: 'friday', startMinutes: 9 * 60, endMinutes: 19 * 60 },
    { dayOfWeek: 'saturday', startMinutes: 10 * 60, endMinutes: 16 * 60 },
  ];

  await Promise.all(
    workingHoursData.map((workingHour) =>
      prisma.workingHours.create({
        data: {
          providerId: demoUser.id,
          dayOfWeek: workingHour.dayOfWeek,
          startMinutes: workingHour.startMinutes,
          endMinutes: workingHour.endMinutes,
          breakWindows: [{ start: '12:30', end: '13:30' }],
          timeZone: 'America/Sao_Paulo',
        },
      }),
    ),
  );

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  const appointmentMorningStart = new Date(tomorrow);
  appointmentMorningStart.setHours(10, 0, 0, 0);
  const appointmentMorningEnd = new Date(appointmentMorningStart.getTime() + 60 * 60 * 1000);

  const appointmentAfternoonStart = new Date(twoDaysLater);
  appointmentAfternoonStart.setHours(15, 30, 0, 0);
  const appointmentAfternoonEnd = new Date(appointmentAfternoonStart.getTime() + 90 * 60 * 1000);

  const [appointmentMorning, appointmentAfternoon] = await Promise.all([
    prisma.appointment.create({
      data: {
        providerId: demoUser.id,
        customerId: mariaCustomer.id,
        serviceId: corteService.id,
        startsAt: appointmentMorningStart,
        endsAt: appointmentMorningEnd,
        status: 'confirmed',
        price: new Prisma.Decimal('150.00'),
        currency: 'BRL',
        source: 'online',
        notes: 'Cliente solicitou reconstrucao capilar adicional.',
      },
    }),
    prisma.appointment.create({
      data: {
        providerId: demoUser.id,
        customerId: pedroCustomer.id,
        serviceId: coloracaoService.id,
        startsAt: appointmentAfternoonStart,
        endsAt: appointmentAfternoonEnd,
        status: 'pending',
        price: new Prisma.Decimal('350.00'),
        currency: 'BRL',
        source: 'manual',
        notes: 'Confirmar disponibilidade de tonalizante acinzentado.',
      },
    }),
  ]);

  await prisma.block.create({
    data: {
      providerId: demoUser.id,
      startsAt: new Date(tomorrow.setHours(13, 0, 0, 0)),
      endsAt: new Date(tomorrow.setHours(14, 0, 0, 0)),
      reason: 'Reuniao de alinhamento com equipe.',
      type: 'maintenance',
    },
  });

  await prisma.paymentRecord.create({
    data: {
      providerId: demoUser.id,
      appointmentId: appointmentMorning.id,
      customerId: mariaCustomer.id,
      amount: new Prisma.Decimal('150.00'),
      currency: 'BRL',
      method: 'pix',
      status: 'received',
      description: 'Pagamento confirmado via PIX.',
      recordedAt: new Date(),
      receivedAt: new Date(),
    },
  });

  await prisma.paymentRecord.create({
    data: {
      providerId: demoUser.id,
      appointmentId: appointmentAfternoon.id,
      customerId: pedroCustomer.id,
      amount: new Prisma.Decimal('350.00'),
      currency: 'BRL',
      method: 'credit_card',
      status: 'pending',
      description: 'Pagamento sera realizado no dia do atendimento.',
      recordedAt: new Date(),
    },
  });

  console.log('Seed executado com sucesso para o usuario demo de agendamentos.');
}

main()
  .catch((error) => {
    console.error('Falha ao executar seed Prisma:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
