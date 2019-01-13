import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import $ from 'jquery';

import Panel from '../Site/Panel';
import Messages from '../GameBoard/Messages';
import Avatar from '../Site/Avatar';
import SelectDeckModal from './SelectDeckModal';
import DeckStatus from '../Decks/DeckStatus';
import AlertPanel from '../Site/AlertPanel';
import * as actions from '../../actions';

class PendingGame extends React.Component {
    constructor() {
        super();

        this.isGameReady = this.isGameReady.bind(this);
        this.onSelectDeckClick = this.onSelectDeckClick.bind(this);
        this.onLeaveClick = this.onLeaveClick.bind(this);
        this.onStartClick = this.onStartClick.bind(this);
        this.onChange = this.onChange.bind(this);
        this.onKeyPress = this.onKeyPress.bind(this);
        this.onSendClick = this.onSendClick.bind(this);
        this.onMouseOut = this.onMouseOver.bind(this);

        this.state = {
            playerCount: 1,
            decks: [],
            playSound: true,
            message: '',
            decksLoading: true,
            waiting: false
        };

        this.notification = undefined;
    }

    componentDidMount() {
        this.props.loadDecks();
        this.props.loadStandaloneDecks();
    }

    componentWillReceiveProps(props) {
        if(!props.user) {
            return;
        }

        let players = this.getNumberOfPlayers(props);

        if(this.notification && this.state.playerCount === 1 && players === 2 && props.currentGame.owner === this.props.user.username) {
            let promise = this.notification.play();

            if(promise !== undefined) {
                promise.catch(() => {
                }).then(() => {
                });
            }

            if(window.Notification && Notification.permission === 'granted') {
                let otherPlayer = Object.values(props.currentGame.players).find(p => p.name !== props.user.username);
                let windowNotification = new Notification('The Iron Throne', { body: `${otherPlayer.name} has joined your game`, icon: `/img/avatar/${otherPlayer.username}.png` });

                setTimeout(() => windowNotification.close(), 5000);
            }

        }

        if(props.connecting) {
            this.setState({ waiting: false });
        }

        this.setState({ playerCount: players });
    }

    componentDidUpdate() {
        $(this.refs.messagePanel).scrollTop(999999);
    }

    isGameReady() {
        if(!this.props.user) {
            return false;
        }

        if(!Object.values(this.props.currentGame.players).every(player => {
            let deck = this.getPlayerDeck(player);

            return !!deck;
        })) {
            return false;
        }

        return this.props.currentGame.owner === this.props.user.username;
    }

    onSelectDeckClick() {
        $('#decks-modal').modal('show');
    }

    selectDeck(deck) {
        $('#decks-modal').modal('hide');

        this.props.sendSocketMessage('selectdeck', this.props.currentGame.id, deck.id);
    }

    getNumberOfPlayers(props) {
        return Object.values(props.currentGame.players).length;
    }

    getPlayerDeck(player) {
        let playerCustomData = player.customData && JSON.parse(player.customData);

        if(!playerCustomData) {
            return undefined;
        }

        return playerCustomData.deck;
    }

    getPlayerStatus(player, username) {
        let playerIsMe = player && player.name === username;

        let deck = null;
        let selectLink = null;
        let status = null;

        let playerDeck = this.getPlayerDeck(player);

        if(playerDeck) {
            if(playerIsMe) {
                let deckName = this.props.decks.find(d => d.id === playerDeck.id).name;
                deck = <span className='deck-selection clickable' onClick={ this.onSelectDeckClick }>{ deckName }</span>;
            } else {
                deck = <span className='deck-selection'>Deck Selected</span>;
            }

            status = <DeckStatus status={ playerDeck.validationResult } />;
        } else if(player && playerIsMe) {
            selectLink = <span className='card-link' onClick={ this.onSelectDeckClick }>Select deck...</span>;
        }

        return (
            <div className='player-row' key={ player.name }>
                <Avatar username={ player.name } /><span>{ player.name }</span>{ deck } { status } { selectLink }
            </div>);
    }

    getGameStatus() {
        if(this.props.connecting) {
            return 'Connecting to game server: ' + this.props.host;
        }

        if(this.state.waiting) {
            return 'Waiting for lobby server...';
        }

        if(this.getNumberOfPlayers(this.props) < 2) {
            return 'Waiting for players...';
        }

        if(!Object.values(this.props.currentGame.players).every(player => {
            let deck = this.getPlayerDeck(player);

            return deck;
        })) {
            return 'Waiting for players to select decks';
        }

        if(this.props.currentGame.owner === this.props.user.username) {
            return 'Ready to begin, click start to begin the game';
        }

        return 'Ready to begin, waiting for opponent to start the game';
    }

    onLeaveClick(event) {
        event.preventDefault();

        this.props.leaveGame();
    }

    onStartClick(event) {
        event.preventDefault();

        this.setState({ waiting: true });

        this.props.startGame(this.props.currentGame.id);
    }

    sendMessage() {
        if(this.state.message === '') {
            return;
        }

        this.props.sendSocketMessage('chat', this.state.message);

        this.setState({ message: '' });
    }

    onKeyPress(event) {
        if(event.key === 'Enter') {
            this.sendMessage();

            event.preventDefault();
        }
    }

    onSendClick(event) {
        event.preventDefault();

        this.sendMessage();
    }

    onChange(event) {
        this.setState({ message: event.target.value });
    }

    onMouseOver(card) {
        this.props.zoomCard(card);
    }

    disableStartButton() {
        return !this.isGameReady() || this.props.connecting || this.state.waiting;
    }

    render() {
        if(this.props.currentGame && this.props.currentGame.started) {
            return <div>Loading game in progress, please wait...</div>;
        }

        if(!this.props.user) {
            this.props.navigate('/');

            return <div>You must be logged in to play, redirecting...</div>;
        }

        return (
            <div>
                <audio ref={ ref => this.notification = ref }>
                    <source src='/sound/charge.mp3' type='audio/mpeg' />
                    <source src='/sound/charge.ogg' type='audio/ogg' />
                </audio>
                <Panel title={ this.props.currentGame.name }>
                    { this.props.joinFailReason && <AlertPanel type='error' message={ this.props.joinFailReason } /> }

                    <div className='btn-group'>
                        <button className='btn btn-primary' disabled={ this.disableStartButton() } onClick={ this.onStartClick }>Start</button>
                        <button className='btn btn-primary' onClick={ this.onLeaveClick }>Leave</button>
                    </div>
                    <div className='game-status'>{ this.getGameStatus() }</div>
                </Panel>
                <Panel title='Players'>
                    {
                        Object.values(this.props.currentGame.players).map(player => {
                            return this.getPlayerStatus(player, this.props.user.username);
                        })
                    }
                </Panel>
                <Panel title={ `Spectators(${this.props.currentGame.spectators.length})` }>
                    { this.props.currentGame.spectators.map(spectator => {
                        return <div key={ spectator.name }>{ spectator.name }</div>;
                    }) }
                </Panel>
                <Panel title='Chat'>
                    <div className='message-list'>
                        <Messages messages={ this.props.currentGame.messages } onCardMouseOver={ this.onMouseOver } onCardMouseOut={ this.onMouseOut } />
                    </div>
                    <form className='form form-hozitontal'>
                        <div className='form-group'>
                            <input className='form-control' type='text' placeholder='Enter a message...' value={ this.state.message }
                                onKeyPress={ this.onKeyPress } onChange={ this.onChange } />
                        </div>
                    </form>
                </Panel>
                <SelectDeckModal
                    apiLoading={ this.props.apiLoading }
                    apiMessage={ this.props.apiMessage }
                    apiSuccess={ this.props.apiSuccess }
                    decks={ this.props.decks }
                    id='decks-modal'
                    onDeckSelected={ this.selectDeck.bind(this) }
                    standaloneDecks={ this.props.standaloneDecks } />
            </div >);
    }
}

PendingGame.displayName = 'PendingGame';
PendingGame.propTypes = {
    apiLoading: PropTypes.bool,
    apiMessage: PropTypes.string,
    apiSuccess: PropTypes.bool,
    connecting: PropTypes.bool,
    currentGame: PropTypes.object,
    decks: PropTypes.array,
    gameSocketClose: PropTypes.func,
    host: PropTypes.string,
    joinFailReason: PropTypes.string,
    leaveGame: PropTypes.func,
    loadDecks: PropTypes.func,
    loadStandaloneDecks: PropTypes.func,
    navigate: PropTypes.func,
    sendSocketMessage: PropTypes.func,
    socket: PropTypes.object,
    standaloneDecks: PropTypes.array,
    startGame: PropTypes.func,
    user: PropTypes.object,
    zoomCard: PropTypes.func
};

function mapStateToProps(state) {
    return {
        apiLoading: state.api.REQUEST_DECKS ? state.api.REQUEST_DECKS.loading : undefined,
        apiMessage: state.api.REQUEST_DECKS ? state.api.REQUEST_DECKS.message : undefined,
        apiSuccess: state.api.REQUEST_DECKS ? state.api.REQUEST_DECKS.success : undefined,
        connecting: state.games.connecting,
        currentGame: state.lobby.currentGame,
        decks: state.cards.decks,
        host: state.games.gameHost,
        joinFailReason: state.lobby.joinFailReason,
        socket: state.lobby.socket,
        standaloneDecks: state.cards.standaloneDecks,
        user: state.account.user
    };
}

export default connect(mapStateToProps, actions)(PendingGame);
