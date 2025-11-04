import { createContext, useContext } from "react";

const OSMContext = createContext()
const OSMProvider = ({ children }) => {

    const data = {}
    return <OSMContext.Provider value={data}>
        { children }
    </OSMContext.Provider>
}

const useOSM = () => { return useContext(OSMContext) }
export { OSMProvider, useOSM }