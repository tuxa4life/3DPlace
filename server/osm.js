import axios from 'axios'

const coordsToChunk = (lat, lon, zoom = 15) => {
    const x = ((lon + 180) / 360) * 2 ** zoom
    const y = ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** zoom
    return [Math.floor(x), Math.floor(y)]
}

const chunkToCoords = (tileX, tileY, zoom = 15) => {
    const n = Math.PI - (2 * Math.PI * tileY) / 2 ** zoom
    const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
    const lon = (tileX / 2 ** zoom) * 360 - 180
    return { lat, lon }
}

export const getChunks = (lat, lon, radius = 5) => {
    const center = coordsToChunk(lat, lon)
    const chunks = []
    
    const sides = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 0], [0, 1], [1, -1], [1, 0], [1, 1]]
    for (let r = 1; r < radius; r ++) {
        for (let i = 0; i < sides.length; i ++) {
            const id = [center[0] + sides[i][0] * r, center[1] + sides[i][1] * r]
            const coords = chunkToCoords(id[0], id[1])

            chunks.push({id, coords})
        }
    }

    return chunks
}

const fetchWithRetry = async (url, query, retries = 5, delay = 500) => {
    try {
        const res = await axios.get(url, { params: { data: query } })
        return res.data
    } catch (err) {
        console.log('There was error fetchWithRetrying data. Retrying...')
        if (retries <= 0) throw err

        await new Promise((r) => setTimeout(r, delay))
        return fetchWithRetry(url, query, retries - 1, delay)
    }
}

export const loadChunk = async (lat, lon) => {
    const [south, west, north, east] = getChunkCoordinates(lat, lon)
    const url = 'https://overpass-api.de/api/interpreter'
    const query = `
        [out:json][timeout:180];
        (
            way["building"](${south}, ${west}, ${north}, ${east});
            relation["building"](${south}, ${west}, ${north}, ${east});
        );
        out geom;
    `

    const result = await fetchWithRetry(url, query)
    return result.elements
}

export const processOSMData = (elements = []) => {
    return elements.flatMap((e) => {
        const h = e.tags?.['building:levels'] ?? '2'

        if (e.type === 'way') return [{ nodes: e.geometry, levels: h }]
        if (e.type === 'relation') return e.members.map((m) => ({ nodes: m.geometry, levels: h }))

        return []
    })
}

export const scaleOSMData = (dataArray, metersPerLevel = 3) => {
    const EARTH_RADIUS = 6371000

    const latLonToMeters = (lat, lon, refLat, refLon) => {
        const lat1 = (refLat * Math.PI) / 180
        const lat2 = (lat * Math.PI) / 180
        const lon1 = (refLon * Math.PI) / 180
        const lon2 = (lon * Math.PI) / 180

        const dLon = lon2 - lon1
        const x = EARTH_RADIUS * dLon * Math.cos((lat1 + lat2) / 2)

        const dLat = lat2 - lat1
        const y = EARTH_RADIUS * dLat

        return { x, y }
    }

    const refLat = dataArray[0].nodes[0].lat
    const refLon = dataArray[0].nodes[0].lon
    return dataArray.map((data) => {
        if (!data.nodes || data.nodes.length === 0) {
            return { nodes: [], height: 0 }
        }

        const scaledNodes = data.nodes.map((node) => {
            const { x, y } = latLonToMeters(node.lat, node.lon, refLat, refLon)

            return {
                x: Math.round(x * 100) / 100,
                y: Math.round(y * 100) / 100,
            }
        })

        const levels = parseInt(data.levels || 0)
        const heightMeters = levels * metersPerLevel

        return {
            nodes: scaledNodes,
            height: heightMeters,
        }
    })
}
