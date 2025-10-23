import express from "express"
import cors from "cors"
import "dotenv/config"


import routesLavanderias from "./routes/lavanderias"
import routesMaquinas from "./routes/maquinas"
import routesReservas from "./routes/reservas"
import routesClientes from "./routes/clientes"
import routesAdmins from "./routes/admins"
import routesDashboard from "./routes/dashboard"
import routesAdminLogin from "./routes/adminLogin"
import routesLogin from "./routes/login"

const app = express()
const port = process.env.PORT || 3000

app.use(express.json())
app.use(cors())


app.use("/lavanderias", routesLavanderias)
app.use("/maquinas", routesMaquinas)
app.use("/reservas", routesReservas)
app.use("/clientes", routesClientes)
app.use("/admins", routesAdmins)
app.use("/dashboard", routesDashboard)
app.use("/admins/login", routesAdminLogin)
app.use("/login", routesLogin)


app.get("/", (req, res) => {
  res.send(" API: Sistema de Reservas de Lavanderias")
})


app.listen(port, () => {
  console.log(`🚀 Servidor rodando na porta: ${port}`)
})
