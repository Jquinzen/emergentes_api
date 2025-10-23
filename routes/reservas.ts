// src/routes/reservas.ts
import { PrismaClient, StatusReserva } from "@prisma/client"
import { Router } from "express"
import { z } from "zod"
import nodemailer from "nodemailer"
import { verificaToken } from "../middewares/verificaToken"

const prisma = new PrismaClient()
const router = Router()


const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT || 2525),
  secure: false, 
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
})


transporter.verify().then(() => {
  console.log("📬 Mailtrap pronto para enviar e-mails")
}).catch(err => {
  console.warn("⚠️ Falha ao inicializar Mailtrap:", err?.message || err)
})


const criarReservaSchema = z.object({
  clienteId: z.string().uuid({ message: "clienteId inválido" }),
  maquinaId: z.number(),
  startsAt: z.string().datetime({ message: "startsAt deve ser ISO-8601" }),
})

const atualizarReservaSchema = z.object({
  status: z.nativeEnum(StatusReserva, {
    errorMap: () => ({ message: "Status inválido" }),
  }),
  resposta: z.string().max(255).optional(),
})


function addHours(date: Date, hours: number) {
  const d = new Date(date)
  d.setHours(d.getHours() + hours)
  return d
}

async function enviaEmailReserva(
  nome: string,
  email: string,
  assunto: string,
  html: string,
  text?: string
) {
  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: assunto,
    text: text ?? "",
    html,
  })
  console.log("E-mail enviado:", info.messageId)
}


router.get("/", async (_req, res) => {
  try {
    const reservas = await prisma.reserva.findMany({
      include: {
        cliente: true,
        maquina: { include: { lavanderia: true } },
        admin: { select: { id: true, nome: true, email: true } },
      },
      orderBy: { id: "desc" },
    })
    res.status(200).json(reservas)
  } catch (error) {
    console.error("Erro ao listar reservas:", error)
    res.status(400).json(error)
  }
})


router.get("/cliente/:clienteId", async (req, res) => {
  const { clienteId } = req.params
  try {
    const reservas = await prisma.reserva.findMany({
      where: { clienteId },
      include: {
        maquina: { include: { lavanderia: true } },
      },
      orderBy: { startsAt: "desc" },
    })
    res.status(200).json(reservas)
  } catch (error) {
    console.error("Erro ao listar reservas do cliente:", error)
    res.status(400).json(error)
  }
})


router.post("/", async (req, res) => {
  const valida = criarReservaSchema.safeParse(req.body)
  if (!valida.success) {
    return res.status(400).json({ erro: valida.error })
  }

  const { clienteId, maquinaId } = valida.data
  const startsAt = new Date(valida.data.startsAt)
  const endsAt = addHours(startsAt, 1) 

  try {

    const conflito = await prisma.reserva.findFirst({
      where: {
        maquinaId,
        status: { not: "CANCELADA" },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true },
    })

    if (conflito) {
      return res
        .status(400)
        .json({ erro: "Horário indisponível para esta máquina" })
    }

    const reserva = await prisma.reserva.create({
      data: {
        clienteId,
        maquinaId,
        startsAt,
        endsAt,
        status: "PENDENTE",
      },
      include: {
        cliente: true,
        maquina: { include: { lavanderia: true } },
      },
    })

    res.status(201).json(reserva)
  } catch (error: any) {
    console.error("Erro ao criar reserva:", error)
    if (error?.code === "P2003") {
      return res.status(400).json({ erro: "Cliente ou Máquina inexistente" })
    }
    res.status(400).json({ erro: "Erro ao criar reserva" })
  }
})


router.patch("/:id", verificaToken, async (req: any, res) => {
  const { id } = req.params
  const valida = atualizarReservaSchema.safeParse(req.body)
  if (!valida.success) {
    return res.status(400).json({ erro: valida.error })
  }

  const { status, resposta } = valida.data

  const adminId = req?.userLogadoId as string | undefined

  try {
 
    if (status === "CONFIRMADA") {
      const atual = await prisma.reserva.findUnique({
        where: { id: Number(id) },
        select: { maquinaId: true, startsAt: true, endsAt: true },
      })
      if (!atual) return res.status(404).json({ erro: "Reserva não encontrada" })

      const conflito = await prisma.reserva.findFirst({
        where: {
          id: { not: Number(id) },
          maquinaId: atual.maquinaId,
          status: { not: "CANCELADA" },
          startsAt: { lt: atual.endsAt },
          endsAt: { gt: atual.startsAt },
        },
        select: { id: true },
      })
      if (conflito) {
        return res
          .status(400)
          .json({ erro: "Não é possível confirmar: horário conflita com outra reserva" })
      }
    }

    const reserva = await prisma.reserva.update({
      where: { id: Number(id) },
      data: {
        status,
        resposta,
        respondidaEm: new Date(),
        adminId, 
      },
      include: {
        cliente: true,
        maquina: { include: { lavanderia: true } },
        admin: { select: { id: true, nome: true, email: true } },
      },
    })

   
    try {
      const data = new Date(reserva.startsAt)
      const fim = new Date(reserva.endsAt)
      const dia = data.toLocaleDateString("pt-BR")
      const hIni = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      const hFim = fim.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

      const assunto = `Reserva de lavanderia - ${reserva.status}`
      const html = `
        <h3>Olá, ${reserva.cliente.nome}</h3>
        <p>Sua reserva foi <b>${reserva.status}</b>.</p>
        <p><b>Lavanderia:</b> ${reserva.maquina.lavanderia.nome}</p>
        <p><b>Máquina:</b> ${reserva.maquina.tipo}</p>
        <p><b>Data/Hora:</b> ${dia} das ${hIni} às ${hFim}</p>
        ${resposta ? `<p><b>Mensagem:</b> ${resposta}</p>` : ""}
        <p>Obrigado por utilizar nosso sistema.</p>
      `
      await enviaEmailReserva(reserva.cliente.nome, reserva.cliente.email, assunto, html)
    } catch (e) {
      console.warn("Falha ao enviar e-mail de reserva:", e)
    }

  
    if (adminId) {
      await prisma.log.create({
        data: {
          adminId,
          descricao: `Reserva ${status.toLowerCase()}`,
          complemento: `Reserva ${reserva.id} - Cliente ${reserva.clienteId} - Máquina ${reserva.maquinaId}`,
        },
      })
    }

    res.status(200).json(reserva)
  } catch (error: any) {
    console.error("Erro ao atualizar reserva:", error)
    if (error?.code === "P2025") {
      return res.status(404).json({ erro: "Reserva não encontrada" })
    }
    res.status(400).json(error)
  }
})

export default router
