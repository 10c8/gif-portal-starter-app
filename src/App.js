/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';

import './App.css';
import keyPair from './keypair.json';
import idl from './idl.json';
import twitterLogo from './assets/twitter-logo.svg';

// Constants
const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const { SystemProgram, Keypair } = web3;
const PROGRAM_ID = new PublicKey(idl.metadata.address);
const NETWORK = clusterApiUrl('devnet');
const OPTIONS = {
  preflightCommitment: 'processed'
};

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [gifList, setGifList] = useState([]);

  const arr = Object.values(keyPair._keypair.secretKey);
  const secret = new Uint8Array(arr);
  const baseAccount = web3.Keypair.fromSecretKey(secret);

  const getProvider = () => {
    const connection = new Connection(NETWORK, OPTIONS.preflightCommitment);
    const provider = new Provider(
      connection,
      window.solana,
      OPTIONS.preflightCommitment
    );
    return provider;
  };

  const createAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, PROGRAM_ID, provider);

      await program.rpc.initialize({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId
        },
        signers: [ baseAccount ]
      });

      console.log('Created a new BaseAccount with address:',
        baseAccount.publicKey.toString());
      
      await getGifList();
    } catch (err) {
      console.error('Failed to create BaseAccount:', err);
    }
  };

  const isWalletConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log('Phantom wallet found.');

          const res = await solana.connect({ onlyIfTrusted: true });
          console.log('Connected with Public Key:', res.publicKey.toString());

          setWalletAddress(res.publicKey.toString());
        }
      } else {
        alert('Solana object not found! Install Phantom Wallet!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const res = await solana.connect();
      console.log('Connected with Public Key:', res.publicKey.toString());
      setWalletAddress(res.publicKey.toString());
    }
  };

  const onInputChange = evt => {
    const { value } = evt.target;
    setInputValue(value);
  };

  const sendGif = async () => {
    if (inputValue.length === 0)
      return console.log('Empty input. Try again.');
    
    console.log('GIF link:', inputValue);

    try {
      const provider = getProvider();
      const program = new Program(idl, PROGRAM_ID, provider);

      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey
        }
      });

      console.log('GIF sent to program:', inputValue);
      await getGifList();
    } catch(err) {
      console.error('Failed to send GIF:', err);
    }
  };

  const getGifList = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, PROGRAM_ID, provider);
      const account = await program.account.baseAccount
        .fetch(baseAccount.publicKey);

      console.log('Got account data for', account);
      setGifList(account.gifList);
    } catch (err) {
      console.log('Error while fetching GIF list:', err);
      setGifList(null);
    }
  };

  const renderConnectedContainer = () => {
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button
            className="cta-button submit-gif-button"
            onClick={createAccount}
          >
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      );
    }

    return (
      <div className="connected-container">
        <form
          onSubmit={evt => {
            evt.preventDefault();
            sendGif();
          }}
        >
          <input
            type="text"
            placeholder="Enter gif link!"
            value={inputValue}
            onChange={onInputChange}
          />
          <button type="submit" className="cta-button submit-gif-button">
            Submit
          </button>
        </form>
        <div className="gif-grid">
          {gifList.map((item, i) => (
            <div className="gif-item" key={i}>
              <span
                style={{
                  color: '#fff',
                  marginBottom: '15px'
                }}
              >
                {item.userAddress.toString()}
              </span>
              <img src={item.gifLink} alt="" />
            </div>
          ))}
        </div>
      </div>
    );
  };

  useEffect(() => {
    const onLoad = async() => {
      await isWalletConnected();
    };

    window.addEventListener('load', onLoad);
    return() => window.removeEventListener('load', onLoad);
  }, []);

  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching GIF list...');
      getGifList();
    }
  }, [walletAddress]);

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <p className="header">🖼 Cool GIF Portal</p>
          <p className="sub-text">
            View your GIF collection in the metaverse ✨
          </p>
          {walletAddress ? (
            renderConnectedContainer()
          ) : (
            <button
              className="cta-button connect-wallet-button"
              onClick={connectWallet}
            >
              Connect to Wallet
            </button>
          )}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
