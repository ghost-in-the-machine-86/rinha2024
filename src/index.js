import http from 'node:http'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DB_CONNECTION, idleTimeoutMillis: 100, max: 5 })

function json_res(obj, response) {
    response.statusCode = 200
    response.setHeader('Content-Type', 'application/json')
    return JSON.stringify(obj)
}

async function bodyParser(request) {
    const body = []
    request.on('data', chunk => body.push(chunk))
    await new Promise((resolve) => request.on('end', resolve))
    return body
}

const server = http.createServer(async (request, response) => {
    const url_split = request.url.split('/')
    let toReturn

    if (request.method === 'POST' && url_split[1] === 'clientes' && url_split[3] === 'transacoes') {
        const transaction = JSON.parse(await bodyParser(request))
        if (transaction.tipo === 'd' || transaction.tipo === 'c') {
            const client = await pool.connect()
            try {
                const query = transaction.tipo === 'd' ? `SELECT saldo, limite FROM debit($1,$2,$3);` : `SELECT saldo, limite FROM credit($1,$2,$3);`
                const { rows: res } = await client.query(query, [url_split[2], transaction.valor, transaction.descricao])
                toReturn = json_res(res[0], response)
            } catch (e) {
                response.statusCode = e.message === 'P0002' ? 404 : 422
            } finally {
                await client.release()
                response.end(toReturn)
            }
        }
        else {
            response.statusCode = 422
            response.end()
        }
    }
    if (request.method === 'GET' && url_split[1] === 'clientes' && url_split[3] === 'extrato') {
        const client = await pool.connect()
        try {
            const { rows: res } = await client.query(`SELECT * FROM statement(${url_split[2]});`)
            toReturn = json_res(res[0].statement, response)
        } catch (e) {
            response.statusCode = e.message === 'P0002' ? 404 : 422
        } finally {
            await client.release()
            response.end(toReturn)
        }
    }
})

server.listen(process.env.PORT, 'localhost')