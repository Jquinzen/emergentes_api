// src/routes/lavanderias.ts

import { PrismaClient } from "@prisma/client"
import { Router } from "express"
import { z } from "zod"
import { verificaToken } from "../middewares/verificaToken"

const prisma = new PrismaClient()
const router = Router()

// ===== Schema de validação =====
const lavanderiaSchema = z.object({
  nome: z.string().min(3, { message: "Nome deve possuir, no mínimo, 3 caracteres" }),
  foto: z
    .string()
    .url({ message: "A foto deve ser uma URL válida" })
    .optional()
    .or(z.literal("").transform(() => undefined)),
  endereco: z.string().min(5, { message: "Endereço deve possuir, no mínimo, 5 caracteres" }),
  destaque: z.boolean().optional(),
})

// ===== Helpers: contadores por lavanderia =====
async function contarMaquinasPorLavanderia(ids: number[]) {
  if (ids.length === 0) {
    return { ativas: new Map<number, number>(), totais: new Map<number, number>() }
  }

  const ativas = await prisma.maquina.groupBy({
    by: ["lavanderiaId"],
    _count: { _all: true },
    where: { lavanderiaId: { in: ids }, ativa: true },
  })
  const mapAtivas = new Map<number, number>()
  for (const r of ativas) mapAtivas.set(r.lavanderiaId, r._count._all)

  const totais = await prisma.maquina.groupBy({
    by: ["lavanderiaId"],
    _count: { _all: true },
    where: { lavanderiaId: { in: ids } },
  })
  const mapTotais = new Map<number, number>()
  for (const r of totais) mapTotais.set(r.lavanderiaId, r._count._all)

  return { ativas: mapAtivas, totais: mapTotais }
}

// ===== GET /lavanderias =====
router.get("/", async (_req, res) => {
  try {
    const lavanderias = await prisma.lavanderia.findMany({
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        endereco: true,
        foto: true,
        destaque: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const ids = lavanderias.map((l) => l.id)
    const { ativas, totais } = await contarMaquinasPorLavanderia(ids)

    const resposta = lavanderias.map((l) => ({
      ...l,
      qntMaquinas: ativas.get(l.id) ?? 0,
      qntMaquinasTotal: totais.get(l.id) ?? 0,
    }))

    res.status(200).json(resposta)
  } catch (error) {
    console.error("Erro ao listar lavanderias:", error)
    res.status(500).json({ erro: "Erro ao listar lavanderias" })
  }
})

// ===== GET /lavanderias/:id =====
router.get("/:id(\\d+)", async (req, res) => {
  const id = Number(req.params.id)
  try {
    const lav = await prisma.lavanderia.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        endereco: true,
        foto: true,
        destaque: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    if (!lav) return res.status(404).json({ erro: "Lavanderia não encontrada" })

    const [qAtivas, qTotal] = await Promise.all([
      prisma.maquina.count({ where: { lavanderiaId: id, ativa: true } }),
      prisma.maquina.count({ where: { lavanderiaId: id } }),
    ])

    res.status(200).json({ ...lav, qntMaquinas: qAtivas, qntMaquinasTotal: qTotal })
  } catch (error) {
    console.error("Erro ao buscar lavanderia:", error)
    res.status(500).json({ erro: "Erro ao buscar lavanderia" })
  }
})

// ===== POST /lavanderias =====
router.post("/", verificaToken, async (req: any, res) => {
  const valida = lavanderiaSchema.safeParse(req.body)
  if (!valida.success) {
    const flat = valida.error.flatten()
    return res.status(400).json({ erro: "Dados inválidos", detalhes: flat.fieldErrors })
  }

  const { nome, foto, endereco, destaque } = valida.data

  try {
    const lavanderia = await prisma.lavanderia.create({
      data: { nome, foto, endereco, destaque: destaque ?? false },
      select: {
        id: true,
        nome: true,
        endereco: true,
        foto: true,
        destaque: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // log opcional
    try {
      await prisma.log.create({
        data: {
          adminId: req.admin?.id,
          descricao: "Cadastro de lavanderia",
          complemento: `Lavanderia: ${lavanderia.nome} (id ${lavanderia.id})`,
        },
      })
    } catch (e) {
      console.warn("Falha ao registrar log de criação de lavanderia:", e)
    }

    const [qAtivas, qTotal] = await Promise.all([
      prisma.maquina.count({ where: { lavanderiaId: lavanderia.id, ativa: true } }),
      prisma.maquina.count({ where: { lavanderiaId: lavanderia.id } }),
    ])

    res.status(201).json({ ...lavanderia, qntMaquinas: qAtivas, qntMaquinasTotal: qTotal })
  } catch (error) {
    console.error("Erro ao criar lavanderia:", error)
    res.status(400).json({ erro: "Erro ao criar lavanderia" })
  }
})

// ===== PUT /lavanderias/:id =====
router.put("/:id(\\d+)", verificaToken, async (req: any, res) => {
  const id = Number(req.params.id)
  const valida = lavanderiaSchema.safeParse(req.body)
  if (!valida.success) {
    const flat = valida.error.flatten()
    return res.status(400).json({ erro: "Dados inválidos", detalhes: flat.fieldErrors })
  }

  const { nome, foto, endereco, destaque } = valida.data

  try {
    const lavanderia = await prisma.lavanderia.update({
      where: { id },
      data: { nome, foto, endereco, destaque: destaque ?? false },
      select: {
        id: true,
        nome: true,
        endereco: true,
        foto: true,
        destaque: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // log opcional
    try {
      await prisma.log.create({
        data: {
          adminId: req.admin?.id,
          descricao: "Atualização de lavanderia",
          complemento: `Lavanderia: ${lavanderia.nome} (id ${lavanderia.id})`,
        },
      })
    } catch (e) {
      console.warn("Falha ao registrar log de atualização de lavanderia:", e)
    }

    const [qAtivas, qTotal] = await Promise.all([
      prisma.maquina.count({ where: { lavanderiaId: id, ativa: true } }),
      prisma.maquina.count({ where: { lavanderiaId: id } }),
    ])

    res.status(200).json({ ...lavanderia, qntMaquinas: qAtivas, qntMaquinasTotal: qTotal })
  } catch (error) {
    console.error("Erro ao atualizar lavanderia:", error)
    res.status(400).json({ erro: "Erro ao atualizar lavanderia" })
  }
})

// ===== DELETE /lavanderias/:id (cascata: apaga máquinas e a lavanderia) =====
router.delete("/:id(\\d+)", verificaToken, async (req: any, res) => {
  const id = Number(req.params.id)
  try {
    const existe = await prisma.lavanderia.findUnique({
      where: { id },
      select: { id: true, nome: true },
    })
    if (!existe) return res.status(404).json({ erro: "Lavanderia não encontrada" })

    await prisma.$transaction([
      prisma.maquina.deleteMany({ where: { lavanderiaId: id } }),
      prisma.lavanderia.delete({ where: { id } }),
    ])

    // log opcional
    try {
      await prisma.log.create({
        data: {
          adminId: req.admin?.id,
          descricao: "Exclusão de lavanderia (com máquinas em cascata)",
          complemento: `Lavanderia: ${existe.nome} (id ${existe.id})`,
        },
      })
    } catch (e) {
      console.warn("Falha ao registrar log de exclusão de lavanderia:", e)
    }

    return res.status(204).send()
  } catch (error: any) {
    if (error?.code === "P2025") return res.status(404).json({ erro: "Lavanderia não encontrada" })
    console.error("Erro ao excluir lavanderia:", error)
    return res.status(400).json({ erro: "Erro ao excluir lavanderia" })
  }
})

// ===== PATCH /lavanderias/:id/destaque (toggle) =====
router.patch("/:id(\\d+)/destaque", verificaToken, async (req: any, res) => {
  const id = Number(req.params.id)
  try {
    const atual = await prisma.lavanderia.findUnique({
      where: { id },
      select: { id: true, nome: true, destaque: true },
    })
    if (!atual) return res.status(404).json({ erro: "Lavanderia não encontrada" })

    const atualizado = await prisma.lavanderia.update({
      where: { id },
      data: { destaque: !atual.destaque },
      select: {
        id: true,
        nome: true,
        endereco: true,
        foto: true,
        destaque: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // log opcional
    try {
      await prisma.log.create({
        data: {
          adminId: req.admin?.id,
          descricao: "Alternância de destaque da lavanderia",
          complemento: `Lavanderia: ${atualizado.nome} (id ${atualizado.id}) -> ${atualizado.destaque ? "Destaque" : "Sem destaque"}`,
        },
      })
    } catch (e) {
      console.warn("Falha ao registrar log do destaque:", e)
    }

    return res.status(200).json(atualizado)
  } catch (error) {
    console.error("Erro ao alternar destaque:", error)
    return res.status(400).json({ erro: "Erro ao alternar destaque" })
  }
})

export default router
