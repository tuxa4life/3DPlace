import axios from 'axios'

const getChunkCoordinates = (lat, lon) => [lat - 0.02, lon - 0.02, lat + 0.02, lon + 0.02]

const fetchWithRetry = async (url, query, retries = 5, delay = 500) => {
    try {
        const res = await axios.get(url, { params: { data: query } })
        return res.data.elements
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

    return await fetchWithRetry(url, query)
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

    return dataArray.map((data) => {
        if (!data.nodes || data.nodes.length === 0) {
            return { nodes: [], height_meters: 0 }
        }

        const nodes = data.nodes

        const refLat = nodes[0].lat
        const refLon = nodes[0].lon

        const scaledNodes = nodes.map((node) => {
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
            height_meters: heightMeters,
            reference_point: {
                lat: refLat,
                lon: refLon,
            },
        }
    })
}
