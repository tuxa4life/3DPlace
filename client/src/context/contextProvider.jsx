import { OSMProvider } from './osmContext'
import { SocketProvider } from './socketContext'

const ContextProvider = ({ children }) => {
    return (
        <OSMProvider>
            <SocketProvider>
                {children}
            </SocketProvider>
        </OSMProvider>
    )
}

export default ContextProvider
