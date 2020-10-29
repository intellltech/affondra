import Vue from "vue";
import Vuex from "vuex";
import axios from "axios";
import app from "./app.js";
// import cosmos from "@tendermint/vue/src/store/cosmos.js";
import { Secp256k1HdWallet, SigningCosmosClient, makeCosmoshubPath  } from "@cosmjs/launchpad";

Vue.use(Vuex);

const API = "http://192.168.1.160:1317";
// const API = "http://affondra.com:1317";
const ADDRESS_PREFIX = "cosmos"

axios.defaults.baseURL = 'http://localhost:8080';
axios.defaults.headers.common['Content-Type'] = 'application/json;charset=utf-8';
axios.defaults.headers.common['Access-Control-Allow-Origin'] = '*';

export default new Vuex.Store({
  state: {
    app,
    account: {},
    chain_id: "",
    data: {},
    client: null,
  },
  mutations: {
    accountUpdate(state, { account }) {
      state.account = account;
    },
    chainIdSet(state, { chain_id }) {
      state.chain_id = chain_id;
    },
    entitySet(state, { type, body }) {
      const updated = {};
      updated[type] = body;
      state.data = { ...state.data, ...updated };
    },
    clientUpdate(state, { client }) {
      state.client = client;
    },
  },
  actions: {
    async init({ dispatch, state }) {
      await dispatch("chainIdFetch");
      state.app.types.forEach(({ type }) => {
        dispatch("entityFetch", { type });
      });
    },
    async chainIdFetch({ commit }) {
      const node_info = (await axios.get(`${API}/node_info`)).data.node_info;
      commit("chainIdSet", { chain_id: node_info.network });
    },
    async accountSignIn({ commit }, { mnemonic }) {
      const wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, makeCosmoshubPath(0), ADDRESS_PREFIX);
      const [{ address }] = await wallet.getAccounts();
      const url = `${API}/auth/accounts/${address}`;
      const acc = (await axios.get(url)).data;
      if (acc.result.value.address === address) {
        const account = acc.result.value;
        const client = new SigningCosmosClient(API, address, wallet);
        commit("accountUpdate", { account });
        commit("clientUpdate", { client });
        return account
      } else {
        console.error("Account doesn't exist.");
        return null;
      }
    },
    async entityFetch({ state, commit }, { type }) {
      const { chain_id } = state;
      const url = `${API}/${chain_id}/${type}`;
      const body = (await axios.get(url)).data.result;
      commit("entitySet", { type, body });
    },
    async accountUpdate({ state, commit }) {
      const url = `${API}/auth/accounts/${state.client.senderAddress}`;
      const acc = (await axios.get(url)).data;
      const account = acc.result.value;
      commit("accountUpdate", { account });
    },
    async entitySubmit({ state }, { type, body }) {
      const { chain_id } = state;
      const creator = state.client.senderAddress;
			console.log(creator)
      const base_req = { chain_id, from: creator };
      const req = { base_req, creator, ...body };
      const { data } = await axios.post(`${API}/${chain_id}/${type}`, req);
      const { msg, fee, memo } = data.value;
      return await state.client.signAndBroadcast(msg, fee, memo);
    },
    async entitySubmitFaucet({ state }, { type, body }) {
      const { chain_id } = state;
      const creator = state.client.senderAddress;
			console.log(creator)
      const base_req = { chain_id, from: creator };
      const req = { base_req, creator, ...body };
      const { data } = await axios.post(`${API}/faucet/${type}`, req);
      const { msg, fee, memo } = data.value;
      return await state.client.signAndBroadcast(msg, fee, memo);
    },
  },
});
