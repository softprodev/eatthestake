import React, { useState, useEffect } from "react";
import StakerContract from "./contracts/Staker.json";
import ERC20FactoryContract from "./contracts/ERC20Factory.json";
import MockERC20Contract from "./contracts/MockERC20.json";
import getWeb3 from "./getWeb3";
import BlockchainContext from "./BlockchainContext.js";
import ChildComponent from "./ChildComponent";

import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import Card from 'react-bootstrap/Card';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import FormControl from 'react-bootstrap/FormControl';
import Form from 'react-bootstrap/Form';
import Container from 'react-bootstrap/Container';



import "./App.css";

//function App =() => {
function App() {
  const [web3, setWeb3] = useState(undefined);
  const [accounts, setAccounts] = useState(undefined);
  const [stakerContract, setStakerContract] = useState(undefined);
  const [depositTokenContract, setDepositTokenContract] = useState(undefined);
  const [rewardTokenContract, setRewardTokenContract] = useState(undefined);

  const [erc20Factory, setErc20Factory] = useState(undefined);

  const [campaigns, setCampaigns] = useState([]);

  const [tokenBalances, setTokenBalances] = useState([]);

  const [buyTokensInput, setBuyTokensInput] = useState({});
  const [userDetails, setUserDetails] = useState({});
  const [owner, setOwner] = useState(undefined);

  const TOKENDECIMALS = 18;

  useEffect(() => {
    (async () => {
      try {
        // Get network provider and web3 instance.
        const web3 = await getWeb3();
  
        // Use web3 to get the user's accounts.
        //const accounts = await web3.eth.getAccounts();
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });

  
        // Get the contract instance.
        //const networkId = await web3.eth.net.getId();
        const networkId = await window.ethereum.request({ method: 'net_version' });
        const deployedNetwork = StakerContract.networks[networkId];
        const instance = new web3.eth.Contract(
          StakerContract.abi,
          deployedNetwork && deployedNetwork.address,
        );

        const erc20FactoryDeployedNetwork = ERC20FactoryContract.networks[networkId];
        const erc20Factoryinstance = new web3.eth.Contract(
          ERC20FactoryContract.abi,
          erc20FactoryDeployedNetwork && erc20FactoryDeployedNetwork.address,
        );

        const depositTokenAddr = await instance.methods.depositToken().call({ from: accounts[0] });
        const depositContract = new web3.eth.Contract(MockERC20Contract.abi, depositTokenAddr);
        console.log("debug");
        console.log(depositContract);

        const rewardTokenAddr = await instance.methods.rewardToken().call({ from: accounts[0] });
        const rewardContract = new web3.eth.Contract(MockERC20Contract.abi, rewardTokenAddr);

        console.log(instance);
        console.log(erc20Factoryinstance);

        //console.log("FACTORY " + erc20Factoryinstance.methods);
        //console.log(erc20FactoryDeployedNetwork.address);
  
        // Set web3, accounts, and contract to the state, and then proceed with an
        // example of interacting with the contract's methods.
        setWeb3(web3);
        setAccounts(accounts);
        setStakerContract(instance);
        setErc20Factory(erc20Factoryinstance);
        setDepositTokenContract(depositContract);
        setRewardTokenContract(rewardContract);
        setOwner(await instance.methods.owner().call({ from: accounts[0] }));

        window.ethereum.on('accountsChanged', function (_accounts) {
          setAccounts(_accounts);
        });
          
      } catch (error) {
        // Catch any errors for any of the above operations.
        // TODO switch network is here i think
        alert(
          `Failed to load web3, accounts, or contract. Check console for details.`,
        );
        console.error(error);
      }
    })();

  },[]);

  useEffect(() => {
    const load = async() => { 
      await getUserDetails();
      await getTokensBalance();
      console.log(campaigns);
    }

    if (typeof web3 !== 'undefined'
      && typeof accounts !== 'undefined'
      && typeof stakerContract !== 'undefined'
      && typeof erc20Factory !== 'undefined'
      && typeof depositTokenContract !== 'undefined'
      && typeof rewardTokenContract !== 'undefined') {
        load();
      }
  }, [web3, accounts, stakerContract, erc20Factory, depositTokenContract, rewardTokenContract])


  async function getTokensBalance() {
    const mockAccounts=["0x1d3d35F5A4065753F35bad06239cfB3ACc3a2454", "0xEdA98aB9e5a1E853EA7aE3CDf15B2e6d6Ed3F455", "0x2Ef668067FbA6215149715102EE0631e7333EcDD"];
    mockAccounts.push(stakerContract.options.address);
    const tokens = (await erc20Factory.methods.getTokens().call({ from: accounts[0] }));
    const tokenContracts = [];
    const balances = [["Address"]];
    for (let i = 0; i < tokens.length; i++) {
      const tokContract = new web3.eth.Contract(MockERC20Contract.abi, tokens[i]);
      tokenContracts.push(tokContract);
      const symbol = await tokContract.methods.symbol().call({ from: accounts[0] });
      balances[0].push(symbol + " balance");
    }
    balances[0].push("Pending reward");
    const accountBalances = [];
    for (let i = 0; i < mockAccounts.length; i++) {
      balances.push([mockAccounts[i]]);
      for (let j = 0; j < tokenContracts.length; j++) {
        const balance = await tokenContracts[j].methods.balanceOf(mockAccounts[i]).call({ from: accounts[0] });
        balances[i+1].push(balance);
      }
      balances[i+1].push(await stakerContract.methods.pendingRewards(mockAccounts[i]).call({ from: accounts[0] }));
    }
    console.log(balances);
    setTokenBalances(balances);
    //console.log(accountBalances);
  }

  async function  changeBuyTokensAmount(_cId,event) {
    buyTokensInput[_cId] = event.target.value;
    setBuyTokensInput(buyTokensInput);
  }
  async function deposit(_amount) {
    let amount = web3.utils.toWei("10");
    const txResult = await depositTokenContract.methods.approve(stakerContract.options.address, amount.toString()).send({ from: accounts[0] });
    const t = await stakerContract.methods.deposit(amount).send({ from: accounts[0] });
    await getUserDetails();
    await getTokensBalance();
  }

  async function getTimes(_amount) {
    let t = await stakerContract.methods.getTime().call({ from: accounts[0] });
    console.log(t);
    t = await stakerContract.methods.rewardPeriodEndTimestamp().call({ from: accounts[0] });
    console.log(t);
    t = await stakerContract.methods.lastRewardTimestamp().call({ from: accounts[0] });
    console.log(t);
    console.log(new Date().getTime());
    //await advanceTimeAndBlock(60*60*24*15);
    t = await stakerContract.methods.getTime().call({ from: accounts[0] });
    console.log(t);
    await getTokensBalance();
  }

  async function getUserDetails() {
    console.log(accounts[0]);
    let res = await stakerContract.methods.getFrontendView().call({ from: accounts[0] });
    let depBalance = await depositTokenContract.methods.balanceOf(accounts[0]).call({ from: accounts[0] });
    let depSymbol = await depositTokenContract.methods.symbol().call({ from: accounts[0] });
    let rewSymbol = await rewardTokenContract.methods.symbol().call({ from: accounts[0] });
    //uint256 _rewardPerSecond, uint256 _secondsLeft, uint256 _deposited, uint256 _pending) {
    let parsed = {
      rewardPerSecond: (res["_rewardPerSecond"]*24*60*60/(10**18)).toFixed(6)
      , daysLeft: (res["_secondsLeft"]/60/60/24).toFixed(6)
      , deposited: (res["_deposited"]/10**18).toFixed(6)
      , pending: (res["_pending"]/10**18).toFixed(6)
      , depositTokenBalance: (depBalance/10**18)
      , depSymbol: depSymbol
      , rewSymbol: rewSymbol }
    console.log(res);
    console.log(parsed);
    setUserDetails(parsed);
  }

  async function withdraw(_amount) {
    let amount = web3.utils.toWei("10");
    const t = await stakerContract.methods.withdraw(amount).send({ from: accounts[0] });
    await getUserDetails();
    await getTokensBalance();
  }

  async function addRewards(_amount) {
    let amount = web3.utils.toWei("10");
    let days = 15;
    const txResult = await rewardTokenContract.methods.approve(stakerContract.options.address, amount.toString()).send({ from: accounts[0] });
    const t = await stakerContract.methods.addRewards(amount, days).send({ from: accounts[0] });
    await getUserDetails();
    await getTokensBalance();
  }

  const CardKeyValue = (props) => (
    <>
      <div style={{ display: 'flex' , width: '90%' , margin: 'auto' }}>
        <div>
          {props.label}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          {props.value}
        </div>
      </div><hr/>
    </>
  );


  const Nav2 = () => (
    <>
      <div className="minimalistic-nav-bar">
        <div>
          <img
            alt=""
            src={require('./logo.png')}
            width="410"
            height="40"
            className="d-inline-block align-top"
          />
        </div>
        <div>
          STAKE
        </div>
        <div>
          Connected: <a href="#login">0x..3fa2 </a>
        </div>
      </div>
    </>
  )

  const BalancesTable = () => (
    <>
      <Table striped bordered hover size="sm" variant="dark">
        <thead>
          <tr>
            {tokenBalances[0].map((elem, index) => (
              <th key={index}>{elem}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tokenBalances.slice(1).map((elem, index) =>
            <tr key={index}>
              {elem.map((item, index) => 
                <td key={index}>{item}</td>
              )}
            </tr>
          )}
        </tbody>

      </Table>
    </>
  );


  if (typeof web3 === 'undefined') {
    return <div>Loading Web3, accounts, and contract...</div>;
  }
  return (
    <div className="outerApp">
      <Nav2 />
      <div className="App">
        <BlockchainContext.Provider value={{web3, accounts, stakerContract}}>
          
          <br/><br/>
          <div style={{display: "flex"}}>
            <Container className="square inner-container">
              <br/>
              <CardKeyValue label="Global rewards per day" value={userDetails["rewardPerSecond"]} />
              <CardKeyValue label="Days left" value={userDetails["daysLeft"]} />
              <CardKeyValue label="Your staked" value={userDetails["deposited"]} />
              <CardKeyValue label="Your pending rewards" value={userDetails["pending"]} />
              

              <br/><br/>
              <div className="label-above-button">
                Available {userDetails["depSymbol"]} balance to stake: {userDetails["depositTokenBalance"]}
              </div>
              <div className="input-button-container">
                <div>
                  <Form.Control placeholder="Amount" onChange={(e) => changeBuyTokensAmount(1,e)}/>
                </div>
                <div>
                  <Button onClick={() => deposit(1)} variant="secondary">Stake</Button>
                </div>
              </div><br/>
              <div className="label-above-button">
                {userDetails["depSymbol"]} staked: {userDetails["deposited"]}
              </div>
              <div className="input-button-container">
                <div>
                  <Form.Control placeholder="Amount" onChange={(e) => changeBuyTokensAmount(1,e)}/>
                </div>
                <div>
                  <Button onClick={() => withdraw(1)} variant="secondary">Unstake</Button>
                </div>
              </div><br/>
              <div className="label-above-button">
                Pending {userDetails["rewSymbol"]} rewards: {userDetails["pending"]}
              </div>
              <div className="button-stretch">
                <Button onClick={() => deposit(1)} variant="secondary">Claim rewards</Button>
              </div>
              <br/>
            </Container>
          </div>
          <div>
            <br/>
            <hr />
            <br/>
            Loaded ETH address: <b>{accounts && accounts[0]?accounts[0] : undefined}</b><br/>
            Loaded Staker address: <b>{stakerContract?stakerContract.options.address : undefined}</b><br/><br/>

            <b>Dev dashboard</b><br/><br/>
            <Button onClick={getTokensBalance} variant="secondary">Get Tokens Balance</Button>{' '}
            <Button onClick={deposit} variant="secondary">Deposit</Button>{' '}
            <Button onClick={withdraw} variant="secondary">Withdraw</Button>{' '}
            <Button onClick={addRewards} variant="secondary">Add rewards</Button>{' '}
            <Button onClick={getUserDetails} variant="secondary">Deets</Button>{' '}
            <br /><br />
            {(tokenBalances && tokenBalances.length>0)?<BalancesTable /> : undefined}
          </div>
        </BlockchainContext.Provider>
      </div>
    </div>
    
  )
}

export default App;
