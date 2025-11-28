import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Chip,
  IconButton,
  Modal,
  Portal,
  ProgressBar,
  Surface,
  Text,
  TextInput,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import CardPokemon, { coresPorTipo } from "./components/CardPokemon";
import useCache from "./hooks/useCache";
import useNetwork from "./hooks/useNetwork";

interface Pokemon {
  name: string;
  url: string;
}
interface PokemonType {
  name: string;
  url: string;
}

interface PokemonDetalhes {
  name: string;
  id: number;
  sprites: {
    front_default: string;
    other: {
      "official-artwork": {
        front_default: string;
      };
    };
  };
  types: {
    type: {
      name: string;
    };
  }[];
  height: number;
  weight: number;
  abilities: {
    ability: {
      name: string;
    };
  }[];
  stats: {
    base_stat: number;
    stat: {
      name: string;
    };
  }[];
}

export default function Index() {
  const [pokemons, setPokemons] = useState<Pokemon[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [textoBusca, setTextoBusca] = useState("");
  const [modalVisivel, setModalVisivel] = useState(false);
  const [pokemonSelecionado, setPokemonSelecionado] =
    useState<PokemonDetalhes | null>(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const [offset, setOffset] = useState(0);
  const limite = 20;
  const [erroBusca, setErroBusca] = useState(false);
  const [temMaisDados, setTemMaisDados] = useState(true);

  const { salvarNoCache, buscarDoCache, usandoCache } = useCache();
  const { isOffline } = useNetwork();
  const [usandoOCache, setUsandoOCache] = useState(false);

  const [tentativas, setTentativas] = useState(0);
  const [ultimoErro, setUltimoErro] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [tiposPokemon, setTiposPokemon] = useState<PokemonType[]>([]);
  const [tipoSelecionado, setTipoSelecionado] = useState<string>("all");
  const [carregandoTipos, setCarregandoTipos] = useState(false);
  const [filtroAtivo, setFiltroAtivo] = useState(false);

  const requestsAtivos = useRef<Set<AbortController>>(new Set());
  const themeColor = "#EF4444";

  const fazerRefreshEmBackground = async (cacheKey: string, url: string) => {
    if (isOffline) return;

    try {
      const response = await fetchComTimeoutERetry(url);
      if (response.ok) {
        const dados = await response.json();
        await salvarNoCache(cacheKey, dados);
      }
    } catch (error) {
      // falha silenciosa q não afeta o usuário
      console.log("Refresh em background falhou:", error);
    }
  };

  const delay = (tentativa: number) => {
    // isso serve pra calcular o delay com jitter (que é um tempo aleatório)
    const baseDelay = Math.min(1000 * Math.pow(2, tentativa), 30000); // delay exponencial com 30s de tempo maxino
    const jitter = Math.random() * 1000;

    return baseDelay + jitter;
  };

  const fetchComTimeoutERetry = async (
  url: string,
  tentativa = 0
): Promise<Response> => { 
  const MAX_TENTATIVAS = 3;
  const TIMEOUT_MS = 10000; // 10 segundos de timeout pra cada requisicao dai faz o retry

  setTentativas(tentativa + 1); // atualizar estado de tentativas

  // criar novo abortcontroller p cada tentativa (serve pra cancelar a requisicao se demorar demais)
  abortControllerRef.current = new AbortController();
  const timeoutId = setTimeout(() => {
    abortControllerRef.current?.abort();
  }, TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: abortControllerRef.current.signal,
    });

    clearTimeout(timeoutId);

    // se for erro 500 e afins faz retry
    if (
      response.status >= 500 &&
      response.status < 600 &&
      tentativa < MAX_TENTATIVAS
    ) {
      const proximoDelay = delay(tentativa);
      await new Promise((resolve) => setTimeout(resolve, proximoDelay));
      return fetchComTimeoutERetry(url, tentativa + 1);
    }

    return response; 
  } catch (error: any) {
    clearTimeout(timeoutId);

    // se foi abortado por timeout ou cancelamento
    if (error.name === "AbortError") {
      throw new Error("Timeout: requisição muito lenta");
    }

    // outros erros de rede ele faz retry
    if (tentativa < MAX_TENTATIVAS) {
      const proximoDelay = delay(tentativa);
      await new Promise((resolve) => setTimeout(resolve, proximoDelay));
      return fetchComTimeoutERetry(url, tentativa + 1);
    }

    throw error;
  }
};

 const buscarTiposPokemon = async () => {
  setCarregandoTipos(true);
  try {
    const response = await fetchComTimeoutERetry(
      "https://pokeapi.co/api/v2/type"
    );
    const dados = await response.json(); 
    // filtra apenas tipos de pokémon
    const tiposValidos = dados.results.filter(
      (tipo: PokemonType) => !["shadow", "unknown"].includes(tipo.name)
    );
    setTiposPokemon(tiposValidos);
  } catch (error) {
    console.error("Erro ao carregar tipos:", error);
  } finally {
    setCarregandoTipos(false);
  }
};

  const buscarPokemonsPorTipo = async (
  tipo: string,
  novoOffset: number = 0
) => {
  if (tipo === "all") {
    buscarPokemons(novoOffset, false);
    setFiltroAtivo(false);
    return;
  }

  const cacheKey = `pokemons_tipo_${tipo}_${novoOffset}_${limite}`;

  // tenta do cache primeiro (se tiver salvo no cache nao faz a requisisxao)
  const cacheData = await buscarDoCache(cacheKey);
  if (cacheData && novoOffset === 0) {
    setPokemons(cacheData.pokemonsPaginados || []);
    setOffset(novoOffset);
    setTemMaisDados(cacheData.temMais);

    if (!isOffline) {
      fazerRefreshEmBackground(
        cacheKey,
        `https://pokeapi.co/api/v2/type/${tipo}`
      );
    }

    setCarregando(false);
    setCarregandoMais(false);
    return;
  }

  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }

  setCarregando(true);
  setFiltroAtivo(true);
  setErroBusca(false);

  try {
    const response = await fetchComTimeoutERetry(
      `https://pokeapi.co/api/v2/type/${tipo}`
    );
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const dados = await response.json();

    if (!dados.pokemon || !Array.isArray(dados.pokemon)) {
      throw new Error("Dados inválidos da API - pokemon não encontrado");
    }

    // pega os pokémon do tipo selecionado
    const pokemonsDoTipo = dados.pokemon.map((p: any) => p.pokemon);

    // paginação manual dos pokémon do tipo
    const inicio = novoOffset;
    const fim = inicio + limite;
    const pokemonsPaginados = pokemonsDoTipo.slice(inicio, fim);

    // salva no cache
    await salvarNoCache(cacheKey, {
      pokemonsPaginados,
      temMais: fim < pokemonsDoTipo.length,
    });

    if (novoOffset === 0) {
      setPokemons(pokemonsPaginados || []);
    } else {
      setPokemons((prev) => [...(prev || []), ...pokemonsPaginados]);
    }

    setOffset(novoOffset);
    setTemMaisDados(fim < pokemonsDoTipo.length);
    setUltimoErro(null);
  } catch (error: any) {
    console.error("Erro ao buscar Pokémon por tipo:", error);

    // tenta usar cache como fallback
    const fallbackCache = await buscarDoCache(cacheKey);
    if (fallbackCache && novoOffset === 0) {
      setPokemons(fallbackCache.pokemonsPaginados || []);
      setOffset(novoOffset);
      setTemMaisDados(fallbackCache.temMais);
    } else {
      setErroBusca(true);
      setUltimoErro(error.message);
      setPokemons([]); // garante que pokemons nunca fique undefined
    }
  } finally {
    setCarregando(false);
    setCarregandoMais(false);
  }
};
  const buscarPokemons = async (
    novoOffset: number,
    append: boolean = false
  ) => {
    if (filtroAtivo && tipoSelecionado !== "all") {
      // se tem filtro ativo usa a busca por tipo
      buscarPokemonsPorTipo(tipoSelecionado, novoOffset);
      return;
    }

    const cacheKey = `pokemons_${novoOffset}_${limite}`;

    // tenta do cache primeiro (só se não for append)
    const cacheData = await buscarDoCache(cacheKey);
    if (cacheData && !append) {
      setUsandoOCache(true);
      setPokemons(cacheData.results || []); // fallback para array vazio
      setOffset(novoOffset);
      setTemMaisDados(cacheData.results.length === limite);

      // se offline para aqui
      if (isOffline) {
        setCarregando(false);
        setCarregandoMais(false);
        return;
      }

      setUsandoOCache(false);

      // se online faz refresh em background
      fazerRefreshEmBackground(
        cacheKey,
        `https://pokeapi.co/api/v2/pokemon?limit=${limite}&offset=${novoOffset}`
      );
      return;
    }

    if (abortControllerRef.current) {
      // cancela requisicao anterior se tiver pra nao ter conglito
      abortControllerRef.current.abort();
    }

    if (append) {
      setCarregandoMais(true);
    } else {
      setCarregando(true);
    }
    setErroBusca(false);
    try {
      const response = await fetchComTimeoutERetry(
        `https://pokeapi.co/api/v2/pokemon?limit=${limite}&offset=${novoOffset}`
      );
      const dados = await response.json();

      // salva no cache (só se não for append)
      if (!append) {
        await salvarNoCache(cacheKey, dados);
      }

      if (append) {
        setPokemons((prev) => [...(prev || []), ...dados.results]); // fallback para array vazio
      } else {
        setPokemons(dados.results || []); //  fallback para array vazio
      }
      setOffset(novoOffset);
      setTemMaisDados(dados.results.length === limite); // verifica se tem mais dados pra carregar
    } catch (error) {
      console.error("Error ao buscar Pokémon:", error);

      // tenta usar cache como fallback (só se não for append)
      const fallbackCache = await buscarDoCache(cacheKey);
      if (fallbackCache && !append) {
        setPokemons(fallbackCache.results || []); // fallback para array vazio
        setOffset(novoOffset);
        setTemMaisDados(fallbackCache.results.length === limite);
      } else {
        setErroBusca(true);
        setPokemons([]);
      }
    } finally {
      setCarregando(false);
      setCarregandoMais(false);
    }
  };

  const carregarMais = useCallback(() => {
    if (!carregando && !carregandoMais && temMaisDados) {
      if (filtroAtivo && tipoSelecionado !== "all") {
        buscarPokemonsPorTipo(tipoSelecionado, offset + limite);
      } else {
        buscarPokemons(offset + limite, true);
      }
    }
  }, [
    carregando,
    carregandoMais,
    temMaisDados,
    offset,
    filtroAtivo,
    tipoSelecionado,
  ]); // callback para evitar recriações desnecessárias

  const buscarDetalhesPokemon = async (pokemonNome: string) => {
    const cacheKey = `pokemon_${pokemonNome}`;

    // tenta do cache primeiro
    const cacheData = await buscarDoCache(cacheKey);
    if (cacheData) {
      setPokemonSelecionado(cacheData);
      setModalVisivel(true);
      setCarregandoDetalhes(false);

      // se online, faz refresh em background
      if (!isOffline) {
        fazerRefreshEmBackground(
          cacheKey,
          `https://pokeapi.co/api/v2/pokemon/${pokemonNome.toLowerCase()}`
        );
      }
      return;
    }

    setCarregandoDetalhes(true);
    setModalVisivel(true);

    if (isOffline) {
      Alert.alert(
        "Offline",
        "Pokémon não encontrado no cache. Conecte-se à internet para buscar dados atualizados."
      );
      setModalVisivel(false);
      setCarregandoDetalhes(false);
      return;
    }

    try {
      const response = await fetchComTimeoutERetry(
        `https://pokeapi.co/api/v2/pokemon/${pokemonNome.toLowerCase()}`
      );
      if (response.status === 404) {
        Alert.alert("Pokémon não encontrado!");
        setModalVisivel(false);
        return;
      }
      const dadosPokemon = await response.json();
      setPokemonSelecionado(dadosPokemon);
      await salvarNoCache(cacheKey, dadosPokemon);
    } catch (erro) {
      Alert.alert("Erro", "Erro ao carregar detalhes do pokémon!");
      setModalVisivel(false);
    } finally {
      setCarregandoDetalhes(false);
    }
  };

  const buscarPokemonPorNome = useCallback(() => {
    // cancelar timeout anterior
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // cancelar requisição anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!textoBusca.trim()) {
      buscarPokemons(0);
      return;
    }

    // debounce de 500ms
    timeoutRef.current = setTimeout(async () => {
    setCarregando(true);
    try {
      // tenta buscar do cache primeiro
      const cacheKey = `pokemon_${textoBusca.toLowerCase()}`;
      const cacheData = await buscarDoCache(cacheKey);
      
      if (cacheData) {
        setPokemonSelecionado(cacheData);
        setModalVisivel(true);
        setUltimoErro(null);
        
        // refresh em background se online
        if (!isOffline) {
          fazerRefreshEmBackground(cacheKey, `https://pokeapi.co/api/v2/pokemon/${textoBusca.toLowerCase()}`);
        }
      } else {
        // se não tem cache, busca da API
        const response = await fetchComTimeoutERetry(
          `https://pokeapi.co/api/v2/pokemon/${textoBusca.toLowerCase()}`
        );
        
        if (response.status === 404) {
          Alert.alert('Pokémon não encontrado!');
          return;
        }
        
        const dadosPokemon = await response.json();
        setPokemonSelecionado(dadosPokemon);
        setModalVisivel(true);
        setUltimoErro(null);
        
        // salva no cache
        await salvarNoCache(cacheKey, dadosPokemon);
      }
    } catch (erro: any) {
      Alert.alert('Erro', erro.message || 'Pokémon não encontrado!');
    } finally {
      setCarregando(false);
      setTextoBusca('');
      timeoutRef.current = null; 
    }
  }, 500);
}, [textoBusca]);


  const formatarNomeEstatistica = (estatisticaNome: string) => {
    const statMap: { [key: string]: string } = {
      hp: "HP",
      attack: "Ataque",
      defense: "Defesa",
      "special-attack": "Atq. Esp.",
      "special-defense": "Def. Esp.",
      speed: "Velocidade",
    };
    return statMap[estatisticaNome] || estatisticaNome;
  };

  const getCorTipo = (tipo: string) => {
    return coresPorTipo[tipo] || "#9ca3af";
  };

  const limparFiltros = () => {
    setTipoSelecionado("all");
    setFiltroAtivo(false);
    buscarPokemons(0, false);
  };

  useEffect(() => {
    buscarPokemons(0);
    buscarTiposPokemon();
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const renderizarItemPokemon = ({
    item,
    index,
  }: {
    item: Pokemon;
    index: number;
  }) => (
    <CardPokemon
      pokemon={item}
      numero={offset + index + 1}
      onPress={() => buscarDetalhesPokemon(item.name)}
    />
  );

  const renderizarFooter = () => {
    if (!carregandoMais) return null;

    return (
      <View style={styles.footerContainer}>
        <ActivityIndicator size="small" color={themeColor} />
        <Text style={{ marginTop: 8, color: "gray" }}>
          Carregando mais Pokémon...
        </Text>
      </View>
    );
  };

  const renderizarErro = () => (
    <View style={styles.centerContainer}>
      <Text style={{ color: themeColor, fontSize: 18, marginBottom: 10 }}>
        {ultimoErro || "Erro ao carregar Pokémon"}
      </Text>
      <Text style={{ color: "gray", textAlign: "center", marginBottom: 20 }}>
        Verifique sua conexão e tente novamente
      </Text>
      <Text style={{ color: "gray", fontSize: 12, marginBottom: 10 }}>
        Tentativas: {tentativas}
      </Text>
      <Button
        mode="contained"
        onPress={() => buscarPokemons(offset)}
        buttonColor={themeColor}
      >
        Tentar Novamente
      </Button>
    </View>
  );

   const renderizarHeader = () => (
    <Surface style={styles.header} elevation={2}>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Pokédex Linda</Text>
        <View style={styles.statusContainer}>
          {isOffline && (
            <View style={styles.offlineBadge}>
            <Text style={styles.offlineText}>● Offline</Text>
          </View>
          )}
        </View>
      </View>
    </Surface>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ flex: 1 }}>
          {/* Header */}
          {renderizarHeader()}

          {/* filtros por tipo */}
          {/* filtros por tipo */}
<Surface style={styles.filtersContainer} elevation={1}>
  <View style={styles.filtersHeader}>
    <Text style={styles.filtersTitle}>Pesquisar por tipo</Text>
    {filtroAtivo && (
      <Button
        mode="text"
        onPress={limparFiltros}
        textColor={themeColor}
        compact
      >
        Limpar Filtro
      </Button>
    )}
  </View>

  {carregandoTipos ? (
  <ActivityIndicator size="small" color={themeColor} />
) : (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.tiposContainer}
  >
    <Chip
      selected={tipoSelecionado === "all"}
      onPress={() => {
        setTipoSelecionado("all");
        buscarPokemons(0, false);
      }}
      style={[
        styles.tipoChip,
        tipoSelecionado === "all" && {
          backgroundColor: themeColor,
        },
      ]}
      textStyle={
        tipoSelecionado === "all"
          ? { color: "white" }
          : { color: "#4b5563" }
      }
    >
      Todos
    </Chip>

    {tiposPokemon.map((tipo) => (
      <Chip
        key={tipo.name}
        selected={tipoSelecionado === tipo.name}
        onPress={() => {
          setTipoSelecionado(tipo.name);
          buscarPokemonsPorTipo(tipo.name, 0);
        }}
        style={[
          styles.tipoChip,
          tipoSelecionado === tipo.name && {
            backgroundColor: coresPorTipo[tipo.name] || themeColor,
          },
        ]}
        textStyle={
          tipoSelecionado === tipo.name
            ? { color: "white" }
            : { color: "#4b5563", textTransform: "capitalize" }
        }
      >
        {tipo.name}
      </Chip>
    ))}
  </ScrollView>
)}
</Surface>

          {/* Barra de Busca */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchLabel}>Buscar Pokémon</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={{ flex: 1, backgroundColor: "#fff", height: 45 }}
                mode="outlined"
                placeholder="Nome do Pokémon..."
                value={textoBusca}
                onChangeText={setTextoBusca}
                onSubmitEditing={buscarPokemonPorNome}
                activeOutlineColor={themeColor}
                outlineColor="#e5e7eb"
                textColor="#4b5563"
              />
              <Button
                mode="contained"
                onPress={buscarPokemonPorNome}
                loading={carregando}
                buttonColor={themeColor}
                textColor="white"
                style={styles.searchButton}
                contentStyle={{ height: 45 }}
                labelStyle={{ fontWeight: "bold", fontSize: 16 }}
              >
                Buscar
              </Button>
            </View>
          </View>

          {/* Lista e Loading */}
          <View style={{ flex: 1, paddingHorizontal: 8 }}>
            {erroBusca ? (
              renderizarErro()
            ) : carregando && (pokemons?.length || 0) === 0 ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={themeColor} />
                <Text style={{ marginTop: 10, color: "gray" }}>
                  Carregando Pokémon...
                </Text>
              </View>
            ) : (
              <FlatList
                data={pokemons}
                renderItem={renderizarItemPokemon}
                keyExtractor={(item, index) => `${item.name}-${index}`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                numColumns={2}
                columnWrapperStyle={{ justifyContent: "space-between" }}
                onEndReached={carregarMais} // dispara quando chega perto do final
                onEndReachedThreshold={0.3} // 30% do final p começar a carregar
                ListFooterComponent={renderizarFooter}
              />
            )}
          </View>

          {/* Paginação antigaaa */}
          {/* <View style={styles.paginationContainer}>
             <Button
                mode="contained"
                onPress={() => buscarPokemons(Math.max(0, offset - limite))}
                disabled={offset === 0 || carregando}
                buttonColor={themeColor}
                textColor="white"
                labelStyle={{ fontWeight: 'bold', fontSize: 16 }}
                style={{flex: 1, marginRight: 8}}
              >
                Anterior
              </Button>
              <Button
                mode="contained"
                onPress={() => buscarPokemons(offset + limite)}
                loading={carregando}
                textColor="white"
                buttonColor={themeColor}
                style={{flex: 1, marginLeft: 8}}
                labelStyle={{ fontWeight: 'bold', fontSize: 16 }}
              >
                Próxima
              </Button>
          </View> */}

          <Portal>
            <Modal
              visible={modalVisivel}
              onDismiss={() => setModalVisivel(false)}
              contentContainerStyle={styles.modalContainer}
            >
              {carregandoDetalhes ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color={themeColor} />
                  <Text style={{ marginTop: 10, color: "gray" }}>
                    Carregando detalhes...
                  </Text>
                </View>
              ) : (
                pokemonSelecionado && (
                  <>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>
                        {pokemonSelecionado.name}
                      </Text>
                      <IconButton
                        icon="close"
                        onPress={() => setModalVisivel(false)}
                      />
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                      <View style={{ paddingBottom: 20 }}>
                        <View
                          style={{ alignItems: "center", marginBottom: 16 }}
                        >
                          <Image
                            source={{
                              uri:
                                pokemonSelecionado.sprites.other[
                                  "official-artwork"
                                ].front_default ||
                                pokemonSelecionado.sprites.front_default,
                            }}
                            style={{ width: "100%", height: 200 }}
                            resizeMode="contain"
                          />
                        </View>

                        {/* Numero */}
                        <Text
                          style={{
                            textAlign: "center",
                            color: "gray",
                            marginBottom: 16,
                          }}
                        >
                          #{pokemonSelecionado.id.toString().padStart(3, "0")}
                        </Text>

                        {/* Tipos */}
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "center",
                            marginBottom: 16,
                          }}
                        >
                          {pokemonSelecionado.types.map((typeInfo, index) => (
                            <Chip
                              key={index}
                              style={{
                                backgroundColor: getCorTipo(typeInfo.type.name),
                                marginHorizontal: 4,
                              }}
                              textStyle={{
                                color: "white",
                                textTransform: "capitalize",
                              }}
                            >
                              {typeInfo.type.name}
                            </Chip>
                          ))}
                        </View>

                        {/* Infos Peso/Altura */}
                        <Surface style={styles.infoBox} elevation={0}>
                          <View style={{ alignItems: "center" }}>
                            <Text
                              style={{ fontWeight: "bold", color: "#4b5563" }}
                            >
                              Altura
                            </Text>
                            <Text style={{ color: "#4b5563" }}>
                              {(pokemonSelecionado.height / 10).toFixed(1)} m
                            </Text>
                          </View>
                          <View
                            style={{
                              height: "100%",
                              width: 1,
                              backgroundColor: "#e5e7eb",
                            }}
                          />
                          <View style={{ alignItems: "center" }}>
                            <Text
                              style={{ fontWeight: "bold", color: "#4b5563" }}
                            >
                              Peso
                            </Text>
                            <Text style={{ color: "#4b5563" }}>
                              {(pokemonSelecionado.weight / 10).toFixed(1)} kg
                            </Text>
                          </View>
                        </Surface>

                        <View style={{ marginBottom: 16 }} />

                        {/* Habilidades */}
                        <View style={{ marginBottom: 16 }}>
                          <Text style={styles.sectionTitle}>Habilidades</Text>
                          <View
                            style={{ flexDirection: "row", flexWrap: "wrap" }}
                          >
                            {pokemonSelecionado.abilities.map(
                              (ability, index) => (
                                <Chip
                                  key={index}
                                  mode="outlined"
                                  textStyle={{
                                    textTransform: "capitalize",
                                    color: "white",
                                  }}
                                  style={{
                                    marginRight: 8,
                                    marginBottom: 8,
                                    backgroundColor: "#EF4444",
                                    borderColor: "#EF4444",
                                  }}
                                >
                                  {ability.ability.name}
                                </Chip>
                              )
                            )}
                          </View>
                        </View>

                        {/* Stats */}
                        <View>
                          <Text style={styles.sectionTitle}>Estatísticas</Text>
                          {pokemonSelecionado.stats.map((stat, index) => (
                            <View key={index} style={{ marginBottom: 8 }}>
                              <View
                                style={{
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                  marginBottom: 4,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 12,
                                    textTransform: "capitalize",
                                    color: "#4b5563",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {formatarNomeEstatistica(stat.stat.name)}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 12,
                                    fontWeight: "bold",
                                    color: "#4b5563",
                                  }}
                                >
                                  {stat.base_stat}
                                </Text>
                              </View>
                              <ProgressBar
                                progress={stat.base_stat / 255}
                                color={getCorTipo(
                                  pokemonSelecionado.types[0].type.name
                                )}
                                style={{ height: 8, borderRadius: 4 }}
                              />
                            </View>
                          ))}
                        </View>
                      </View>
                    </ScrollView>
                  </>
                )
              )}
            </Modal>
          </Portal>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  footerContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerContent: {
    alignItems: 'center',
    paddingVertical: 8
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  offlineBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)', 
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  offlineText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '600',
  },
  offlineChip: {
    height: 20,
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  cacheChip: {
    height: 20,
    backgroundColor: '#faf5ff',
    borderColor: '#8b5cf6',
  },
  header: {
    backgroundColor: "#EF4444",
    padding: 16,
    margin: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  searchContainer: {
    padding: 16,
    backgroundColor: "white",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 1,
  },
  searchLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4b5563",
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchButton: {
    borderRadius: 8,
    justifyContent: "center",
    marginLeft: 8,
  },
  // paginationContainer: {
  //   padding: 16,
  //   backgroundColor: 'white',
  //   borderTopWidth: 1,
  //   borderTopColor: '#e5e7eb',
  //   flexDirection: 'row',
  //   justifyContent: 'space-between'
  // },
  modalContainer: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    maxHeight: "85%",
    width: "90%",
    alignSelf: "center",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textTransform: "capitalize",
    color: "#111827",
  },
  infoBox: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  sectionTitle: {
    fontWeight: "bold",
    color: "#4b5563",
    marginBottom: 8,
    fontSize: 16,
  },
  filtersContainer: {
    backgroundColor: "white",
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  filtersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  filtersTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4b5563",
  },
  tiposContainer: {
    paddingRight: 8,
    gap: 8,
  },
  tipoChip: {
    backgroundColor: "#f3f4f6",
    borderColor: "#e5e7eb",
    borderWidth: 1,
  },
});