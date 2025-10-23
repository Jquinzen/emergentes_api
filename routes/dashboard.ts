// src/routes/dashboard.ts
import { PrismaClient, StatusReserva } from "@prisma/client"
import { Router } from "express"

const prisma = new PrismaClient()
const router = Router()


router.get("/gerais", async (_req, res) => {
  try {
    const [clientes, lavanderias, maquinas, reservas] = await Promise.all([
      prisma.cliente.count(),
      prisma.lavanderia.count(),
      prisma.maquina.count(),
      prisma.reserva.count(),
    ])

    res.status(200).json({ clientes, lavanderias, maquinas, reservas })
  } catch (error) {
    console.error("Erro em /dashboard/gerais:", error)
    res.status(500).json({ erro: "Erro ao consultar métricas gerais" })
  }
})

type LavanderiaCount = {
  nome: string
  _count: { maquinas: number }
}


router.get("/maquinasLavanderia", async (_req, res) => {
  try {
    const rows = await prisma.lavanderia.findMany({
      select: {
        nome: true,
        _count: { select: { maquinas: true } },
      },
      orderBy: { nome: "asc" },
    })

    const resultado = (rows as LavanderiaCount[])
      .filter((l) => l._count.maquinas > 0)
      .map((l) => ({
        lavanderia: l.nome,
        num: l._count.maquinas,
      }))

    res.status(200).json(resultado)
  } catch (error) {
    console.error("Erro em /dashboard/maquinasLavanderia:", error)
    res.status(500).json({ erro: "Erro ao consultar máquinas por lavanderia" })
  }
})

type ReservaGroupByStatus = {
  status: StatusReserva
  _count: { status: number }
}


router.get("/reservasStatus", async (_req, res) => {
  try {
    const rows = await prisma.reserva.groupBy({
      by: ["status"],
      _count: { status: true },
    })

    const resultado = (rows as ReservaGroupByStatus[]).map((r) => ({
      status: r.status,
      num: r._count.status,
    }))

    res.status(200).json(resultado)
  } catch (error) {
    console.error("Erro em /dashboard/reservasStatus:", error)
    res.status(500).json({ erro: "Erro ao consultar reservas por status" })
  }
})

export default router
