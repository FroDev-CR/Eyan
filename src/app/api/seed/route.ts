import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { User, Driver, Truck, Route, Assignment } from "@/models";
import { addDays, format } from "date-fns";

export async function POST() {
  try {
    await dbConnect();

    // Auth: bootstrap si no hay admin todavía, sino requiere admin session
    const adminExists = await User.exists({ role: "admin" });
    if (adminExists) {
      const session = await getServerSession(authOptions);
      if (!session?.user || session.user.role !== "admin") {
        return NextResponse.json(
          { success: false, error: "No autorizado. Solo admin puede resetear datos." },
          { status: 403 }
        );
      }
    }

    // Limpiar colecciones existentes
    await Promise.all([
      User.deleteMany({}),
      Driver.deleteMany({}),
      Truck.deleteMany({}),
      Route.deleteMany({}),
      Assignment.deleteMany({}),
    ]);

    // Crear usuarios admin/dispatcher (sin driverId)
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const users = await User.insertMany([
      {
        name: "Administrador",
        email: "admin@eyan.com",
        password: hashedPassword,
        role: "admin",
        isActive: true,
      },
      {
        name: "María Dispatch",
        email: "maria@eyan.com",
        password: hashedPassword,
        role: "dispatcher",
        isActive: true,
      },
    ]);

    // Crear coordinadores (entidades Driver)
    const drivers = await Driver.insertMany([
      {
        firstName: "Juan",
        lastName: "Pérez",
        phone: "+506 8888-1111",
        email: "juan@eyan.com",
        licenseNumber: "LIC001234",
        licenseExpiry: addDays(new Date(), 365),
        status: "available",
      },
      {
        firstName: "Carlos",
        lastName: "Rodríguez",
        phone: "+506 8888-2222",
        email: "carlos@eyan.com",
        licenseNumber: "LIC002345",
        licenseExpiry: addDays(new Date(), 400),
        status: "available",
      },
      {
        firstName: "Miguel",
        lastName: "Fernández",
        phone: "+506 8888-3333",
        email: "miguel@eyan.com",
        licenseNumber: "LIC003456",
        licenseExpiry: addDays(new Date(), 200),
        status: "on_route",
      },
      {
        firstName: "Roberto",
        lastName: "Solís",
        phone: "+506 8888-4444",
        email: "roberto@eyan.com",
        licenseNumber: "LIC004567",
        licenseExpiry: addDays(new Date(), 180),
        status: "available",
      },
      {
        firstName: "Andrés",
        lastName: "Mora",
        phone: "+506 8888-5555",
        email: "andres@eyan.com",
        licenseNumber: "LIC005678",
        licenseExpiry: addDays(new Date(), 90),
        status: "off_duty",
      },
    ]);

    // Crear usuarios coordinadores vinculados a cada Driver (password: coord123)
    const coordPassword = await bcrypt.hash("coord123", 10);
    const driverUsers = await User.insertMany(
      drivers.map((d) => ({
        name: `${d.firstName} ${d.lastName}`,
        email: d.email,
        password: coordPassword,
        role: "driver",
        driverId: d._id,
        isActive: true,
      }))
    );

    // Crear camiones
    const trucks = await Truck.insertMany([
      {
        plateNumber: "ABC-123",
        name: "Camión Azul",
        brand: "Volvo",
        model: "VNL 760",
        year: 2022,
        capacity: "20 toneladas",
        type: "cargo",
        status: "available",
        currentMileage: 45000,
      },
      {
        plateNumber: "DEF-456",
        name: "Refrigerado 01",
        brand: "Freightliner",
        model: "Cascadia",
        year: 2021,
        capacity: "15 toneladas",
        type: "refrigerated",
        status: "available",
        currentMileage: 62000,
      },
      {
        plateNumber: "GHI-789",
        name: "Plataforma Norte",
        brand: "Kenworth",
        model: "T680",
        year: 2023,
        capacity: "25 toneladas",
        type: "flatbed",
        status: "in_use",
        currentMileage: 12000,
      },
      {
        plateNumber: "JKL-012",
        name: "Cisterna 01",
        brand: "Peterbilt",
        model: "579",
        year: 2020,
        capacity: "10000 litros",
        type: "tanker",
        status: "available",
        currentMileage: 89000,
      },
      {
        plateNumber: "MNO-345",
        name: "Camión Rojo",
        brand: "International",
        model: "LT",
        year: 2022,
        capacity: "18 toneladas",
        type: "cargo",
        status: "maintenance",
        currentMileage: 55000,
        notes: "En revisión de frenos",
      },
    ]);

    // Crear rutas
    const routes = await Route.insertMany([
      {
        name: "San José → Limón",
        origin: "San José",
        destination: "Limón",
        estimatedDuration: 240, // 4 horas
        distance: 160,
        description: "Ruta principal hacia la costa caribeña",
        isActive: true,
      },
      {
        name: "San José → Puntarenas",
        origin: "San José",
        destination: "Puntarenas",
        estimatedDuration: 120, // 2 horas
        distance: 115,
        isActive: true,
      },
      {
        name: "San José → Guanacaste",
        origin: "San José",
        destination: "Liberia",
        estimatedDuration: 240, // 4 horas
        distance: 220,
        description: "Ruta hacia el norte del país",
        isActive: true,
      },
      {
        name: "Cartago → Heredia",
        origin: "Cartago",
        destination: "Heredia",
        estimatedDuration: 60, // 1 hora
        distance: 35,
        isActive: true,
      },
      {
        name: "Alajuela → San Carlos",
        origin: "Alajuela",
        destination: "Ciudad Quesada",
        estimatedDuration: 150, // 2.5 horas
        distance: 95,
        isActive: true,
      },
      {
        name: "San José → Pérez Zeledón",
        origin: "San José",
        destination: "San Isidro",
        estimatedDuration: 180, // 3 horas
        distance: 135,
        isActive: true,
      },
    ]);

    // Crear asignaciones de ejemplo (para esta semana)
    const today = new Date();
    const adminUser = users[0];

    const assignments = await Assignment.insertMany([
      {
        date: today,
        startTime: "06:00",
        endTime: "10:00",
        driverId: drivers[0]._id,
        truckId: trucks[0]._id,
        routeId: routes[0]._id,
        status: "scheduled",
        createdBy: adminUser._id,
      },
      {
        date: today,
        startTime: "07:30",
        endTime: "09:30",
        driverId: drivers[1]._id,
        truckId: trucks[1]._id,
        routeId: routes[3]._id,
        status: "in_progress",
        createdBy: adminUser._id,
      },
      {
        date: addDays(today, 1),
        startTime: "05:00",
        endTime: "09:00",
        driverId: drivers[0]._id,
        truckId: trucks[0]._id,
        routeId: routes[2]._id,
        status: "scheduled",
        notes: "Carga especial - manejar con cuidado",
        createdBy: adminUser._id,
      },
      {
        date: addDays(today, 1),
        startTime: "08:00",
        endTime: "11:00",
        driverId: drivers[2]._id,
        truckId: trucks[2]._id,
        routeId: routes[5]._id,
        status: "scheduled",
        createdBy: adminUser._id,
      },
      {
        date: addDays(today, 2),
        startTime: "06:30",
        endTime: "12:30",
        driverId: drivers[1]._id,
        truckId: trucks[1]._id,
        routeId: routes[0]._id,
        status: "scheduled",
        createdBy: adminUser._id,
      },
      {
        date: addDays(today, 3),
        startTime: "07:00",
        endTime: "09:30",
        driverId: drivers[3]._id,
        truckId: trucks[3]._id,
        routeId: routes[4]._id,
        status: "scheduled",
        createdBy: adminUser._id,
      },
    ]);

    return NextResponse.json({
      success: true,
      message: "Datos de prueba creados exitosamente",
      data: {
        users: users.length + driverUsers.length,
        drivers: drivers.length,
        trucks: trucks.length,
        routes: routes.length,
        assignments: assignments.length,
      },
    });
  } catch (error) {
    console.error("Error al crear datos de prueba:", error);
    return NextResponse.json(
      { success: false, error: "Error al crear datos de prueba" },
      { status: 500 }
    );
  }
}
