import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ACCI Platform API',
      version: '1.0.0',
      description:
        'API REST para la plataforma de gestión académica de la Academia de Crecimiento Cristiano Integral (ACCI). Incluye autenticación, gestión de cursos, actividades, asistencia y más.',
      contact: {
        name: 'ACCI Platform',
        email: 'admin@acci.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Desarrollo local',
      },
      {
        url: 'https://api.acci.com',
        description: 'Producción',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token. Obtenerlo en POST /auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'No autorizado' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clxyz123' },
            email: { type: 'string', format: 'email', example: 'usuario@acci.com' },
            fullName: { type: 'string', example: 'Juan Pérez' },
            role: { type: 'string', enum: ['STUDENT', 'TEACHER', 'ADMIN'] },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Course: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            code: { type: 'string', example: 'PROG-101' },
            name: { type: 'string', example: 'Introducción a la Programación' },
            description: { type: 'string' },
            isActive: { type: 'boolean' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            teacher: { $ref: '#/components/schemas/User' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Autenticación y gestión de sesiones' },
      { name: 'Users', description: 'Gestión de usuarios (ADMIN)' },
      { name: 'Courses', description: 'Cursos y matrículas' },
      { name: 'Activities', description: 'Actividades, quizzes y tareas' },
      { name: 'Attendance', description: 'Registro de asistencia' },
      { name: 'Periods', description: 'Períodos académicos' },
      { name: 'Dashboard', description: 'Métricas del dashboard' },
      { name: 'Audit', description: 'Logs de auditoría (ADMIN)' },
      { name: 'Health', description: 'Estado del servicio' },
    ],
  },
  apis: ['./src/routes/*.js', './src/app.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
