import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View
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
  TextInput
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import CardPokemon, { coresPorTipo } from './components/CardPokemon';

interface Pokemon {
  name: string; 
  url: string;   
}

interface PokemonDetalhes {
  name: string;
  id: number;
  sprites: {
    front_default: string;
    other: {
      'official-artwork': {
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
  const [textoBusca, setTextoBusca] = useState('');
  const [modalVisivel, setModalVisivel] = useState(false);
  const [pokemonSelecionado, setPokemonSelecionado] = useState<PokemonDetalhes | null>(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const [offset, setOffset] = useState(0); 
  const limite = 20; 
  const [erroBusca, setErroBusca] = useState(false);

  const themeColor = "#EF4444"; 

  const buscarPokemons = async (novoOffset: number) => {
    setCarregando(true);
    setErroBusca(false); 
    try{
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${limite}&offset=${novoOffset}`);
      const dados = await response.json();
      setPokemons(dados.results);
      setOffset(novoOffset); 
    } catch (error) {
      console.error('Error ao buscar Pokémon:', error);
      setErroBusca(true);
    } finally {
      setCarregando(false);
    }
  };

  const buscarDetalhesPokemon = async (pokemonNome: string) => {
    setCarregandoDetalhes(true);
    setModalVisivel(true); 
    try{
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonNome.toLowerCase()}`);
        if (response.status === 404) {
          Alert.alert('Pokémon não encontrado!');
          setModalVisivel(false);
          return;
        }
        const dadosPokemon = await response.json();
        setPokemonSelecionado(dadosPokemon);
    } catch (erro) {
        Alert.alert('Erro', 'Erro ao carregar detalhes do pokémon!');
        setModalVisivel(false);
    } finally {
        setCarregandoDetalhes(false)
    }
  };

  const buscarPokemonPorNome = async () => {
    if (!textoBusca.trim()) {
      buscarPokemons(0);
      return;
    }

    setCarregando(true);
    try{
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${textoBusca.toLowerCase()}`);
      if (response.status === 404) {
        Alert.alert('Pokémon não encontrado!');
        return;
      }
      const dadosPokemon = await response.json();
      setPokemonSelecionado(dadosPokemon);
      setModalVisivel(true);
    } catch (erro){
      Alert.alert('Erro', 'Pokémon não encontrado!');
    } finally {
      setCarregando(false); 
      setTextoBusca('');
    }
  };

  const formatarNomeEstatistica = (estatisticaNome: string) => {
    const statMap: { [key: string]: string } = {
      'hp': 'HP',
      'attack': 'Ataque',
      'defense': 'Defesa',
      'special-attack': 'Atq. Esp.',
      'special-defense': 'Def. Esp.',
      'speed': 'Velocidade'
    };
    return statMap[estatisticaNome] || estatisticaNome;
  }

  const getCorTipo = (tipo: string) => {
    return coresPorTipo[tipo] || '#9ca3af';
  };

  useEffect(() => {
    buscarPokemons(0);
  }, []);

  const renderizarItemPokemon = ({ item, index }: { item: Pokemon; index: number }) => (
    <CardPokemon
      pokemon={item}
      numero={offset + index + 1}
      onPress={() => buscarDetalhesPokemon(item.name)}
    />
  );

  const renderizarErro = () => (
    <View style={styles.centerContainer}>
      <Text style={{color: themeColor, fontSize: 18, marginBottom: 10}}>Erro ao carregar Pokémon</Text>
      <Text style={{color: 'gray', textAlign: 'center', marginBottom: 20}}>
        Verifique sua conexão e tente novamente
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ flex: 1 }}>

          {/* Header */}
          <Surface style={styles.header} elevation={2}>
            <Text style={styles.headerTitle}>Pokédex Linda</Text>
          </Surface>

          {/* Barra de Busca */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchLabel}>Buscar Pokémon</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={{ flex: 1, backgroundColor: '#fff', height: 45 }}
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
                contentStyle={{height: 45}}
                labelStyle={{ fontWeight: 'bold', fontSize: 16 }}
              >
                Buscar
              </Button>
            </View>
          </View>

          {/* Lista e Loading */}
          <View style={{ flex: 1, paddingHorizontal: 8 }}>
            {erroBusca ? ( 
              renderizarErro() 
            ) : carregando && pokemons.length === 0 ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={themeColor} />
                <Text style={{marginTop: 10, color: 'gray'}}>Carregando Pokémon...</Text>
              </View>
            ) : (
              <FlatList
                data={pokemons}
                renderItem={renderizarItemPokemon}
                keyExtractor={(item) => item.name}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                numColumns={2}
                columnWrapperStyle={{ justifyContent: 'space-between' }}
              />
            )}
          </View>

          {/* Paginação */}
          <View style={styles.paginationContainer}>
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
          </View>

          <Portal>
            <Modal 
              visible={modalVisivel} 
              onDismiss={() => setModalVisivel(false)}
              contentContainerStyle={styles.modalContainer}
            >
              {carregandoDetalhes ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color={themeColor} />
                  <Text style={{marginTop: 10, color: 'gray'}}>Carregando detalhes...</Text>
                </View>
              ) : pokemonSelecionado && (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{pokemonSelecionado.name}</Text>
                    <IconButton icon="close" onPress={() => setModalVisivel(false)} />
                  </View>
                  
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{ paddingBottom: 20 }}>
                      
                      <View style={{ alignItems: 'center', marginBottom: 16 }}>
                        <Image
                          source={{
                            uri: pokemonSelecionado.sprites.other['official-artwork'].front_default || 
                                 pokemonSelecionado.sprites.front_default
                          }}
                          style={{ width: '100%', height: 200 }} 
                          resizeMode="contain"
                        />
                      </View>

                      {/* Numero */}
                      <Text style={{ textAlign: 'center', color: 'gray', marginBottom: 16 }}>
                        #{pokemonSelecionado.id.toString().padStart(3, '0')}
                      </Text>

                      {/* Tipos */}
                      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 16 }}>
                        {pokemonSelecionado.types.map((typeInfo, index) => (
                          <Chip 
                            key={index} 
                            style={{ backgroundColor: getCorTipo(typeInfo.type.name), marginHorizontal: 4 }}
                            textStyle={{ color: 'white', textTransform: 'capitalize' }}
                          >
                            {typeInfo.type.name}
                          </Chip>
                        ))}
                      </View>

                      {/* Infos Peso/Altura */}
                      <Surface style={styles.infoBox} elevation={0}>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontWeight: 'bold', color: '#4b5563' }}>Altura</Text>
                          <Text style={{ color: '#4b5563' }}>{(pokemonSelecionado.height / 10).toFixed(1)} m</Text>
                        </View>
                        <View style={{ height: '100%', width: 1, backgroundColor: '#e5e7eb' }} />
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontWeight: 'bold', color: '#4b5563' }}>Peso</Text>
                          <Text style={{ color: '#4b5563' }}>{(pokemonSelecionado.weight / 10).toFixed(1)} kg</Text>
                        </View>
                      </Surface>
                      
                      <View style={{ marginBottom: 16 }} />

                      {/* Habilidades */}
                      <View style={{ marginBottom: 16 }}>
                        <Text style={styles.sectionTitle}>Habilidades</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                          {pokemonSelecionado.abilities.map((ability, index) => (
                            <Chip 
                              key={index} 
                              mode="outlined" 
                              textStyle={{textTransform: 'capitalize', color: 'white' }}
                              style={{ marginRight: 8, marginBottom: 8, backgroundColor: '#EF4444', borderColor: '#EF4444'}}
                            >
                              {ability.ability.name}
                            </Chip>
                          ))}
                        </View>
                      </View>

                      {/* Stats */}
                      <View>
                        <Text style={styles.sectionTitle}>Estatísticas</Text>
                        {pokemonSelecionado.stats.map((stat, index) => (
                          <View key={index} style={{ marginBottom: 8 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ fontSize: 12, textTransform: 'capitalize', color: '#4b5563', fontWeight: 'bold' }}>
                                {formatarNomeEstatistica(stat.stat.name)}
                              </Text>
                              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#4b5563' }}>
                                {stat.base_stat}
                              </Text>
                            </View>
                            <ProgressBar 
                              progress={stat.base_stat / 255} 
                              color={getCorTipo(pokemonSelecionado.types[0].type.name)}
                              style={{ height: 8, borderRadius: 4 }} 
                            />
                          </View>
                        ))}
                      </View>

                    </View>
                  </ScrollView>
                </>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  header: {
    backgroundColor: '#EF4444',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold'
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 1
  },
  searchLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
    marginBottom: 8
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  searchButton: {
    borderRadius: 8,
    justifyContent: 'center',
    marginLeft: 8 ,
    
  },
  paginationContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    maxHeight: '85%',
    width: '90%', 
    alignSelf: 'center', 
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textTransform: 'capitalize',
    color: '#111827'
  },
  infoBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#4b5563',
    marginBottom: 8,
    fontSize: 16
  }
});