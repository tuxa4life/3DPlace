import { createContext, useContext, useEffect } from "react";
import { io } from 'socket.io-client'

const socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000')

const SocketContext = createContext()
const SocketProvider = ({ children }) => {
    useEffect(() => {
        console.log('Connecting...')
        
        socket.on('connected', () => {
            console.log('Connected successfully!')
        })
    }, [])

    const data = {}
    return <SocketContext.Provider value={data}>
        { children }
    </SocketContext.Provider>
}

const useSockets = () => { return useContext(SocketContext) }
export { SocketProvider, useSockets }