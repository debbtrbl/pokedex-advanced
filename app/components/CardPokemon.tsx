import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  View
} from 'react-native';
import { Text } from 'react-native-paper';

interface PropsCardPokemon {
  pokemon: {
    name: string;
    url: string;
  };
  numero: number;
  onPress: () => void;
}

export const coresPorTipo: { [key: string]: string } = {
  normal: '#A8A77A',
  fire: '#EE8130',
  water: '#6390F0',
  electric: '#F7D02C',
  grass: '#7AC74C',
  ice: '#96D9D6',
  fighting: '#C22E28',
  poison: '#A33EA1',
  ground: '#E2BF65',
  flying: '#A98FF3',
  psychic: '#F95587',
  bug: '#A6B91A',
  rock: '#B6A136',
  ghost: '#735797',
  dragon: '#6F35FC',
  dark: '#705746',
  steel: '#B7B7CE',
  fairy: '#D685AD',
};

export default function CardPokemon({ 
  pokemon, 
  numero, 
  onPress 
}: PropsCardPokemon) {
  const [tipoPokemon, setTipoPokemon] = useState<string>('normal');
  const [carregandoTipo, setCarregandoTipo] = useState(true);
  const [imagemPokemon, setImagemPokemon] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const buscarDetalhesPokemon = async () => {
      try {
        const resposta = await fetch(pokemon.url);
        const dados = await resposta.json();
        if (isMounted) {
          const tipo = dados.types[0]?.type?.name || 'normal';
          const imagem = dados.sprites.other['official-artwork'].front_default || 
                         dados.sprites.front_default;
          
          setTipoPokemon(tipo);
          setImagemPokemon(imagem);
        }
      } catch (erro) {
        if (isMounted) {
          setTipoPokemon('normal');
        }
      } finally {
        if (isMounted) setCarregandoTipo(false);
      }
    };

    buscarDetalhesPokemon();
    return () => { isMounted = false };
  }, [pokemon.url]);

  const corFundo = coresPorTipo[tipoPokemon] || '#9ca3af';

  // Loading State
  if (carregandoTipo) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <ActivityIndicator size="small" color="#9ca3af" />
        <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>...</Text>
      </View>
    );
  }

  return (
    <Pressable 
      style={({ pressed }) => [
        styles.card, 
        { 
          backgroundColor: corFundo,
          opacity: pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }]
        }
      ]}
      onPress={onPress}
    >
      {/* Container Principal */}
      <View style={styles.cardContent}>
        
        {/* Lado Esquerdo: Nome e Tipo */}
        <View style={styles.leftColumn}>
          <Text style={styles.nameText} numberOfLines={1}>
            {pokemon.name}
          </Text>
          
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>
              {tipoPokemon}
            </Text>
          </View>
        </View>

        {/* Lado Direito: ID e Imagem */}
        <View style={styles.rightColumn}>
          <Text style={styles.numberText}>
            #{numero.toString().padStart(3, '0')}
          </Text>
          
          <View style={styles.imageContainer}>
            {imagemPokemon ? (
              <Image
                source={{ uri: imagemPokemon }}
                style={styles.image}
                resizeMode="contain"
              />
            ) : null}
          </View>
        </View>

      </View>
      
      <Image 
        source={{ uri: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png' }}
        style={styles.pokeballBg}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    height: 110, 
    borderRadius: 16,
    elevation: 4, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    overflow: 'hidden', 
    position: 'relative'
  },
  loadingCard: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    height: 110,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row', 
    padding: 12,
    zIndex: 2, 
  },
  leftColumn: {
    flex: 1,
    justifyContent: 'center',
    gap: 4
  },
  rightColumn: {
    flex: 1,
    alignItems: 'flex-end', 
    justifyContent: 'space-between'
  },
  nameText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'capitalize',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  numberText: {
    color: 'rgba(0,0,0,0.2)',
    fontWeight: '900',
    fontSize: 14,
  },
  typeBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  typeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  imageContainer: {
    width: 75,
    height: 75,
    position: 'absolute',
    bottom: -5, 
    right: -5, 
  },
  image: {
    width: '100%',
    height: '100%',
  },
  // Efeito de fundo sutil
  pokeballBg: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    width: 80,
    height: 80,
    opacity: 0.15,
    tintColor: 'white',
    zIndex: 1
  }
});