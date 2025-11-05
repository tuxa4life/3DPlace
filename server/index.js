import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { getChunks, loadChunk, processOSMData, scaleOSMData } from './osm.js'

const app = express()
app.use(cors())

const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
    console.log(` === Server running on port ${PORT} === `)
})

io.on('connection', async (socket) => {
    console.log(`> Client connected: ${socket.id.substring(0, 6)}`)
    socket.emit('connected')

    const data = getChunks(41.715, 44.783)
    socket.emit('test', data)
    socket.on('disconnect', () => {
        console.log(`< Client disconnected: ${socket.id.substring(0, 6)}`)
    })
})
