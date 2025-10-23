// src/routes/clientes.ts
import { PrismaClient } from "@prisma/client"
import { Router } from "express"
import bcrypt from "bcrypt"
import { z } from "zod"

const prisma = new PrismaClient()
const router = Router()


const clienteSchema = z.object({
  nome: z.string().min(10, { message: "Nome do cliente deve possuir, no mínimo, 10 caracteres" }),
  email: z.string().email({ message: "Informe um e-mail válido" }),
  senha: z.string(),
  telefone: z.string().min(8, { message: "Informe um telefone válido" }).optional(),
})

// Força de senha
function validaSenha(senha: string) {
  const mensa: string[] = []
  if (senha.length < 8) mensa.push("Erro... senha deve possuir, no mínimo, 8 caracteres")

  let pequenas = 0, grandes = 0, numeros = 0, simbolos = 0
  for (const letra of senha) {
    if (/[a-z]/.test(letra)) pequenas++
    else if (/[A-Z]/.test(letra)) grandes++
    else if (/[0-9]/.test(letra)) numeros++
    else simbolos++
  }
  if (!pequenas) mensa.push("Erro... senha deve possuir letra(s) minúscula(s)")
  if (!grandes) mensa.push("Erro... senha deve possuir letra(s) maiúscula(s)")
  if (!numeros) mensa.push("Erro... senha deve possuir número(s)")
  if (!simbolos) mensa.push("Erro... senha deve possuir símbolo(s)")
  return mensa
}


router.get("/", async (_req, res) => {
  try {
    const clientes = await prisma.cliente.findMany({
      select: { id: true, nome: true, email: true, telefone: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
    })
    res.status(200).json(clientes)
  } catch (error) {
    console.error("Erro ao listar clientes:", error)
    res.status(500).json({ erro: "Erro ao listar clientes" })
  }
})


router.post("/", async (req, res) => {
  const valida = clienteSchema.safeParse(req.body)
if (!valida.success) {
  const issues = valida.error.issues?.map(i => i.message).join("; ") || "Dados inválidos"
  return res.status(400).json({ erro: issues })
}
  const erros = validaSenha(valida.data.senha)
  if (erros.length > 0) {
    return res.status(400).json({ erro: erros.join("; ") })
  }

  const { nome, email, telefone, senha } = valida.data

  try {
    const salt = bcrypt.genSaltSync(12)
    const hash = bcrypt.hashSync(senha, salt)

    const cliente = await prisma.cliente.create({
      data: { nome, email, senha: hash, telefone },
      select: { id: true, nome: true, email: true, telefone: true, createdAt: true, updatedAt: true },
    })

    res.status(201).json(cliente)
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(400).json({ erro: "E-mail já cadastrado" })
    }
    console.error("Erro ao criar cliente:", error)
    res.status(500).json({ erro: "Erro ao criar cliente" })
  }
})


router.get("/:id", async (req, res) => {
  const { id } = req.params
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      select: { id: true, nome: true, email: true, telefone: true, createdAt: true, updatedAt: true },
    })
    if (!cliente) return res.status(404).json({ erro: "Cliente não encontrado" })
    res.status(200).json(cliente)
  } catch (error) {
    console.error("Erro ao buscar cliente:", error)
    res.status(500).json({ erro: "Erro ao buscar cliente" })
  }
})

export default router
