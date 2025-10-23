import jwt from "jsonwebtoken"
import { Request, Response, NextFunction } from "express"

type TokenType = {
  adminLogadoId: string
  adminLogadoNome: string
  adminLogadoNivel: number
}

// Tipagem global no Express
declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: string
        nome: string
        nivel: number
      }
      userLogadoId?: string
      userLogadoNome?: string
      userLogadoNivel?: number
    }
  }
}

export function verificaToken(req: Request | any, res: Response, next: NextFunction) {
  const { authorization } = req.headers

  if (!authorization) {
    return res.status(401).json({ error: "Token não informado" })
  }

  const token = authorization.split(" ")[1]

  try {
    const decode = jwt.verify(token, process.env.JWT_KEY as string)
    const { adminLogadoId, adminLogadoNome, adminLogadoNivel } = decode as TokenType

    // Guarda as infos do admin logado no req
    req.admin = {
      id: adminLogadoId,
      nome: adminLogadoNome,
      nivel: adminLogadoNivel,
    }

    // compatibilidade com rotas antigas (opcional)
    req.userLogadoId = adminLogadoId
    req.userLogadoNome = adminLogadoNome
    req.userLogadoNivel = adminLogadoNivel

    next()
  } catch (error) {
    return res.status(401).json({ error: "Token inválido" })
  }
}
