const express = require('express');
const bodyParser = require('body-parser');
const TonWeb = require('tonweb');

const app = express();
const port = 3000;

const AUTH_TOKEN = '123456abcdef7890'; // мое сравнение



const tonWeb = new TonWeb( new TonWeb.HttpProvider('https://testnet.toncenter.com/api/v2/jsonRPC', {apiKey: '947bd07c63c2a70ba1cf510d88f894f6cb90d5f50f9e0730ca73baef0f670f9a'}));
console.log('Генерация пары ключей...');
const keyPair = TonWeb.utils.nacl.sign.keyPair();
const senderPrivateKey = TonWeb.utils.bytesToBase64(keyPair.secretKey);
const senderPublicKey = TonWeb.utils.bytesToBase64(keyPair.publicKey);

async function sendTonToken(walletAddress, tokenAmount) {
    const WalletClass = tonWeb.wallet.all.v3R2;
    const wallet = new WalletClass(tonWeb.provider, {
        publicKey: TonWeb.utils.base64ToBytes(senderPublicKey)
    });

    const seqno = await wallet.methods.seqno().call();

    if (typeof seqno !== 'number' || seqno < 0) {
        throw new Error('Invalid seqno value');
    }

    const message = await wallet.methods.transfer({
        secretKey: TonWeb.utils.base64ToBytes(senderPrivateKey),
        toAddress: walletAddress,
        amount: TonWeb.utils.toNano(tokenAmount),
        seqno: seqno,
        sendMode: 3,
        payload: ''
    });

    const txId = await message.send();
    return txId;
}


app.use(bodyParser.json());

app.post('/sendToken', async (req, res) => {
    const { walletAddress, tokenAmount } = req.body;
    const clientToken = req.headers['authorization'];

    if (!clientToken || clientToken !== `Bearer ${AUTH_TOKEN}`) {
        return res.status(401).json({ error: 'Неверный токен авторизации' });
    }

    if (!walletAddress || !tokenAmount) {
        return res.status(400).json({ error: 'Недостаточно данных' });
    }

    try {
        const txId = await sendTonToken(walletAddress, tokenAmount);
        console.log(`Токены успешно отправлены. ID транзакции: ${txId}`);
        res.status(200).json({ message: 'Токены успешно отправлены', txId: txId });
    } catch (error) {
        console.error('Ошибка при отправке токенов:', error);
        res.status(500).json({ error: 'Ошибка при отправке токенов' });
    }
});

app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});

module.exports = app;

