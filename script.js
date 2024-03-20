const express = require('express');
const bodyParser = require('body-parser');
const TonWeb = require('tonweb');
const bip39 = require('bip39');

const app = express();
const port = 3000;

const AUTH_TOKEN = '123456abcdef7890';

const tonWeb = new TonWeb(new TonWeb.HttpProvider('https://testnet.toncenter.com/api/v2/jsonRPC', {
    apiKey: '947bd07c63c2a70ba1cf510d88f894f6cb90d5f50f9e0730ca73baef0f670f9a'
}));
const mnemonic = "мнемоник тут";

bip39.mnemonicToSeed(mnemonic).then((seed) => {
    const keyPair = TonWeb.utils.nacl.sign.keyPair.fromSeed(new Uint8Array(seed.slice(0, 32)));

    const senderPrivateKey = keyPair.secretKey;
    const senderPublicKey = keyPair.publicKey;

    async function sendTonToken(walletAddress, tokenAmount, jettonAddress) {
        const WalletClass = tonWeb.wallet.all.v3R2;
        const wallet = new WalletClass(tonWeb.provider, {
            publicKey: senderPublicKey
        });
        const seqno = await wallet.methods.seqno().call();
        if (typeof seqno !== 'number' || seqno < 0) {
            throw new Error('Invalid seqno value');
        }
    
        const JettonWalletClass = tonWeb.wallet.all.v3R2; 
        const jettonWallet = new JettonWalletClass(tonWeb.provider, {
            publicKey: senderPublicKey
        });
    
        const amount = TonWeb.utils.toNano(tokenAmount);
        const payload = await jettonWallet.createTransferBody({
            jettonAmount: amount, 
            toAddress: new TonWeb.utils.Address(walletAddress), 
            forwardAmount: TonWeb.utils.toNano('0.01'), 
            forwardPayload: new TextEncoder().encode('gift'), 
            responseAddress: new TonWeb.utils.Address(walletAddress) 
        });
    
        const txId = await wallet.methods.transfer({
            secretKey: senderPrivateKey,
            toAddress: jettonAddress,
            amount: amount,
            seqno: seqno,
            payload: payload,
            sendMode: 3
        }).send();
    
        return txId;
    }

    app.use(bodyParser.json());

    app.post('/sendToken', async (req, res) => {
        const { walletAddress, tokenAmount, jettonAddress } = req.body;
        const clientToken = req.headers['authorization'];

        if (!clientToken || clientToken !== `Bearer ${AUTH_TOKEN}`) {
            return res.status(401).json({ error: 'Неверный токен авторизации' });
        }

        if (!walletAddress || !tokenAmount || !jettonAddress) {
            return res.status(400).json({ error: 'Недостаточно данных' });
        }

        try {
            const txId = await sendTonToken(walletAddress, tokenAmount, jettonAddress);
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
});

