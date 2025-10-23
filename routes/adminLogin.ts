// src/routes/adminLogin.ts

import jwt from "jsonwebtoken"
import { PrismaClient } from "@prisma/client"
import { Router } from "express"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()
const router = Router()



router.post("/", async (req, res) => {
  const { email, senha } = req.body


  const mensagemPadrao = "Login ou senha incorretos"

  if (!email || !senha) {
    return res.status(400).json({ erro: mensagemPadrao })
  }

  try {
    const admin = await prisma.admin.findFirst({
      where: { email },
    })

    if (!admin) {
      return res.status(400).json({ erro: mensagemPadrao })
    }


    const senhaConfere = bcrypt.compareSync(senha, admin.senha)

    if (!senhaConfere) {
      // loga tentativa de acesso indevido
      await prisma.log.create({
        data: {
          descricao: "Tentativa de login inválido",
          complemento: `Admin: ${admin.id} - ${admin.nome}`,
          adminId: admin.id,
        },
      })
      return res.status(400).json({ erro: mensagemPadrao })
    }

    // gera token JWT válido por 1 hora
    const token = jwt.sign(
      {
        adminLogadoId: admin.id,
        adminLogadoNome: admin.nome,
        adminLogadoNivel: admin.nivel,
      },
      process.env.JWT_KEY as string,
      { expiresIn: "1h" }
    )


    res.status(200).json({
      id: admin.id,
      nome: admin.nome,
      email: admin.email,
      nivel: admin.nivel,
      token,
    })
  } catch (error) {
    console.error("Erro no login do admin:", error)
    res.status(500).json({ erro: "Erro interno no servidor" })
  }
})

export default router
