// src/routes/maquinas.ts
import { PrismaClient, TipoMaquina } from "@prisma/client"
import { Router } from "express"
import { z } from "zod"
import { verificaToken } from "../middewares/verificaToken"

const prisma = new PrismaClient()
const router = Router()


const maquinaSchema = z.object({
  tipo: z.nativeEnum(TipoMaquina, { required_error: "Tipo é obrigatório" }),
  lavanderiaId: z.number({ required_error: "lavanderiaId é obrigatório" }),
  ativa: z.boolean().optional(),
})


router.get("/", async (_req, res) => {
  try {
    const maquinas = await prisma.maquina.findMany({
      where: { ativa: true },
      include: { lavanderia: true },
      orderBy: { id: "desc" },
    })
    res.status(200).json(maquinas)
  } catch (error) {
    console.error("Erro ao listar máquinas:", error)
    res.status(500).json({ erro: "Erro ao listar máquinas" })
  }
})


router.get("/todas", verificaToken, async (_req, res) => {
  try {
    const maquinas = await prisma.maquina.findMany({
      include: { lavanderia: true },
      orderBy: { id: "desc" },
    })
    res.status(200).json(maquinas)
  } catch (error) {
    console.error("Erro ao listar todas as máquinas:", error)
    res.status(500).json({ erro: "Erro ao listar todas as máquinas" })
  }
})


router.get("/pesquisa/:termo", async (req, res) => {
  const { termo } = req.params
  const termoUpper = String(termo).toUpperCase().trim()

  const mapTipo: Record<string, TipoMaquina> = { LAVAR: "LAVAR", SECAR: "SECAR" }
  const tipoPesquisado = mapTipo[termoUpper]

  try {
    const maquinas = await prisma.maquina.findMany({
      where: {
        ativa: true,
        OR: [
          ...(tipoPesquisado ? [{ tipo: tipoPesquisado }] as any : []),
          { lavanderia: { nome: { contains: termo, mode: "insensitive" } } },
        ],
      },
      include: { lavanderia: true },
      orderBy: { id: "desc" },
    })
    res.status(200).json(maquinas)
  } catch (error) {
    console.error("Erro na pesquisa de máquinas:", error)
    res.status(500).json({ erro: "Erro na pesquisa de máquinas" })
  }
})


router.patch("/ativar/:id(\\d+)", verificaToken, async (req, res) => {
  const id = z.coerce.number().int().parse(req.params.id)
  try {
    const atual = await prisma.maquina.findUnique({
      where: { id },
      select: { ativa: true },
    })
    if (!atual) return res.status(404).json({ erro: "Máquina não encontrada" })

    const maquina = await prisma.maquina.update({
      where: { id },
      data: { ativa: !atual.ativa },
    })
    res.status(200).json(maquina)
  } catch (error) {
    console.error("Erro ao alternar status da máquina:", error)
    res.status(400).json({ erro: "Erro ao alternar status da máquina" })
  }
})


router.patch("/toggle-ativa/:id(\\d+)", verificaToken, async (req, res) => {
  const id = z.coerce.number().int().parse(req.params.id)
  try {
    const atual = await prisma.maquina.findUnique({
      where: { id },
      select: { ativa: true },
    })
    if (!atual) return res.status(404).json({ erro: "Máquina não encontrada" })

    const maquina = await prisma.maquina.update({
      where: { id },
      data: { ativa: !atual.ativa },
    })
    res.status(200).json(maquina)
  } catch (error) {
    console.error("Erro ao alternar status da máquina (alias):", error)
    res.status(400).json({ erro: "Erro ao alternar status da máquina" })
  }
})


router.get("/:id(\\d+)", async (req, res) => {
  const id = z.coerce.number().int().parse(req.params.id)
  try {
    const maquina = await prisma.maquina.findUnique({
      where: { id },
      include: { lavanderia: true },
    })
    if (!maquina) return res.status(404).json({ erro: "Máquina não encontrada" })
    res.status(200).json(maquina)
  } catch (error) {
    console.error("Erro ao buscar máquina:", error)
    res.status(500).json({ erro: "Erro ao buscar máquina" })
  }
})


router.post("/", verificaToken, async (req: any, res) => {
  const valida = maquinaSchema.safeParse(req.body)
  if (!valida.success) {
    const flat = valida.error.flatten()
    return res.status(400).json({ erro: "Dados inválidos", detalhes: flat.fieldErrors })
  }

  const { tipo, lavanderiaId, ativa = true } = valida.data
  const adminId = req?.admin?.id ?? req?.userLogadoId

  try {
    const maquina = await prisma.maquina.create({
      data: { tipo, lavanderiaId, ativa, ...(adminId ? { adminId } : {}) },
      include: { lavanderia: true },
    })

    if (adminId) {
      await prisma.log.create({
        data: {
          adminId,
          descricao: "Cadastro de máquina",
          complemento: `Máq ${maquina.id} (${maquina.tipo}) - Lavanderia ${maquina.lavanderiaId}`,
        },
      })
    }

    res.status(201).json(maquina)
  } catch (error: any) {
    console.error("Erro ao criar máquina:", error)
    if (error?.code === "P2003") return res.status(400).json({ erro: "Lavanderia informada não existe" })
    res.status(400).json({ erro: "Erro ao criar máquina" })
  }
})


router.put("/:id(\\d+)", verificaToken, async (req: any, res) => {
  const id = z.coerce.number().int().parse(req.params.id)
  const valida = maquinaSchema.safeParse(req.body)
  if (!valida.success) {
    const flat = valida.error.flatten()
    return res.status(400).json({ erro: "Dados inválidos", detalhes: flat.fieldErrors })
  }

  const { tipo, lavanderiaId, ativa = true } = valida.data
  const adminId = req?.admin?.id ?? req?.userLogadoId

  try {
    const maquina = await prisma.maquina.update({
      where: { id },
      data: { tipo, lavanderiaId, ativa, ...(adminId ? { adminId } : {}) },
      include: { lavanderia: true },
    })

    if (adminId) {
      await prisma.log.create({
        data: {
          adminId,
          descricao: "Atualização de máquina",
          complemento: `Máq ${maquina.id} (${maquina.tipo}) - Lavanderia ${maquina.lavanderiaId}`,
        },
      })
    }

    res.status(200).json(maquina)
  } catch (error: any) {
    console.error("Erro ao atualizar máquina:", error)
    if (error?.code === "P2003") return res.status(400).json({ erro: "Lavanderia informada não existe" })
    if (error?.code === "P2025") return res.status(404).json({ erro: "Máquina não encontrada" })
    res.status(400).json({ erro: "Erro ao atualizar máquina" })
  }
})


router.delete("/:id(\\d+)", verificaToken, async (req: any, res) => {
  const id = z.coerce.number().int().parse(req.params.id)
  const adminId = req?.admin?.id ?? req?.userLogadoId
  const adminNome = req?.admin?.nome ?? req?.userLogadoNome ?? "desconhecido"

  try {
    const maquina = await prisma.maquina.update({
      where: { id },
      data: { ativa: false },
      include: { lavanderia: true },
    })

    if (adminId) {
      await prisma.log.create({
        data: {
          adminId,
          descricao: "Desativação de máquina",
          complemento: `Máq ${maquina.id} (${maquina.tipo}) - Por: ${adminNome}`,
        },
      })
    }

    res.status(200).json(maquina)
  } catch (error: any) {
    console.error("Erro ao desativar máquina:", error)
    if (error?.code === "P2025") return res.status(404).json({ erro: "Máquina não encontrada" })
    res.status(400).json({ erro: "Erro ao desativar máquina" })
  }
})

export default router
