import jwt from "jsonwebtoken"
import { PrismaClient } from "@prisma/client"
import { Router } from "express"
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()
const router = Router()

router.post("/", async (req, res) => {
  const { email, senha } = req.body


  const mensaPadrao = "Login ou senha incorretos"

  if (!email || !senha) {

    res.status(400).json({ erro: mensaPadrao })
    return
  }

  try {
    const cliente = await prisma.cliente.findFirst({
      where: { email }
    })

    if (cliente == null) {

      res.status(400).json({ erro: mensaPadrao })
      return
    }


    if (bcrypt.compareSync(senha, cliente.senha)) {

      const token = jwt.sign({
        clienteLogadoId: cliente.id,
        clienteLogadoNome: cliente.nome
      },
        process.env.JWT_KEY as string,
        { expiresIn: "1h" }
      )

      res.status(200).json({
        id: cliente.id,
        nome: cliente.nome,
        email: cliente.email,
        token
      })
    } else {
      res.status(400).json({ erro: mensaPadrao })
    }
  } catch (error) {
    res.status(400).json(error)
  }
})

export default router