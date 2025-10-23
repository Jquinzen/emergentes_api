import { PrismaClient } from "@prisma/client"
import { Router } from "express"
import bcrypt from "bcrypt"
import { z } from "zod"
import { verificaToken } from "../middewares/verificaToken"

const prisma = new PrismaClient()
const router = Router()

const adminSchema = z.object({
  nome: z.string().min(10, { message: "Nome deve possuir, no mínimo, 10 caracteres" }),
  email: z.string().email({ message: "E-mail inválido" }),
  senha: z.string(),
  nivel: z.number().min(1, { message: "Nível, no mínimo, 1" }).max(5, { message: "Nível, no máximo, 5" }),
})

function validaSenha(senha: string) {
  const mensa: string[] = []
  if (senha.length < 8) mensa.push("Erro... senha deve possuir, no mínimo, 8 caracteres")
  let pequenas = 0, grandes = 0, numeros = 0, simbolos = 0
  for (const c of senha) {
    if (/[a-z]/.test(c)) pequenas++
    else if (/[A-Z]/.test(c)) grandes++
    else if (/[0-9]/.test(c)) numeros++
    else simbolos++
  }
  if (pequenas === 0) mensa.push("Erro... senha deve possuir letra(s) minúscula(s)")
  if (grandes === 0) mensa.push("Erro... senha deve possuir letra(s) maiúscula(s)")
  if (numeros === 0) mensa.push("Erro... senha deve possuir número(s)")
  if (simbolos === 0) mensa.push("Erro... senha deve possuir símbolo(s)")
  return mensa
}


router.get("/", async (_req, res) => {
  try {
    const admins = await prisma.admin.findMany({
      select: { id: true, nome: true, email: true, nivel: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
    })
    res.status(200).json(admins)
  } catch (error) {
    console.error("Erro ao listar admins:", error)
    res.status(500).json({ erro: "Erro ao listar administradores" })
  }
})


router.post("/", verificaToken, async (req, res) => {
  const valida = adminSchema.safeParse(req.body)
  if (!valida.success) {
    const flat = valida.error.flatten()
    return res.status(400).json({ erro: "Dados inválidos", detalhes: flat.fieldErrors })
  }
  const { nome, email, nivel, senha } = valida.data

  const errosSenha = validaSenha(senha)
  if (errosSenha.length > 0) {
    return res.status(400).json({ erro: errosSenha.join("; ") })
  }

  try {
    const salt = bcrypt.genSaltSync(12)
    const hash = bcrypt.hashSync(senha, salt)

    const admin = await prisma.admin.create({
      data: { nome, email, senha: hash, nivel },
      select: { id: true, nome: true, email: true, nivel: true, createdAt: true, updatedAt: true },
    })
    return res.status(201).json(admin)
  } catch (error: any) {
    if (error?.code === "P2002") return res.status(400).json({ erro: "E-mail já cadastrado" })
    console.error("Erro ao criar admin:", error)
    return res.status(500).json({ erro: "Erro ao criar administrador" })
  }
})


router.get("/:id", async (req, res) => {
  const id = req.params.id as string
  try {
    const admin = await prisma.admin.findUnique({
      where: { id },
      select: { id: true, nome: true, email: true, nivel: true, createdAt: true, updatedAt: true },
    })
    if (!admin) return res.status(404).json({ erro: "Administrador não encontrado" })
    return res.status(200).json(admin)
  } catch (error) {
    console.error("Erro ao buscar admin:", error)
    return res.status(500).json({ erro: "Erro ao buscar administrador" })
  }
})


const adminUpdateSchema = z.object({
  nome: z.string().min(10).optional(),
  email: z.string().email().optional(),
  nivel: z.number().min(1).max(5).optional(),
})

router.put("/:id", verificaToken, async (req, res) => {
  const id = req.params.id as string
  const valida = adminUpdateSchema.safeParse(req.body)
  if (!valida.success) {
    const flat = valida.error.flatten()
    return res.status(400).json({ erro: "Dados inválidos", detalhes: flat.fieldErrors })
  }

  try {
    const admin = await prisma.admin.update({
      where: { id },
      data: valida.data,
      select: { id: true, nome: true, email: true, nivel: true, createdAt: true, updatedAt: true },
    })
    return res.status(200).json(admin)
  } catch (error: any) {
    if (error?.code === "P2002") return res.status(400).json({ erro: "E-mail já cadastrado" })
    if (error?.code === "P2025") return res.status(404).json({ erro: "Administrador não encontrado" })
    console.error("Erro ao atualizar admin:", error)
    return res.status(500).json({ erro: "Erro ao atualizar administrador" })
  }
})


router.delete("/:id", verificaToken, async (req: any, res) => {
  const id = req.params.id as string

  try {
 
    const requesterId = String(req?.admin?.id ?? req?.userLogadoId ?? "")
    if (requesterId && requesterId === id) {
      return res.status(400).json({ erro: "Você não pode excluir a si mesmo." })
    }


    const alvo = await prisma.admin.findUnique({ where: { id }, select: { id: true, nivel: true } })
    if (!alvo) return res.status(404).json({ erro: "Administrador não encontrado" })
    if (alvo.nivel === 5) {
      const superAdmins = await prisma.admin.count({ where: { nivel: 5 } })
      if (superAdmins <= 1) {
        return res.status(400).json({ erro: "Não é possível excluir o último Super Admin." })
      }
    }

    await prisma.admin.delete({ where: { id } })
    return res.status(204).send()
  } catch (error) {
    console.error("Erro ao deletar admin:", error)
    return res.status(500).json({ erro: "Erro ao deletar administrador" })
  }
})

export default router
