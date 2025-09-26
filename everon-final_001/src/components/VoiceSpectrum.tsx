const VoiceSpectrum = () => (
    <div className="voice-spectrum" aria-hidden>
        {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className="voice-bar" style={{ animationDelay: `${i * 0.12}s` }} />
        ))}
    </div>
);

export default VoiceSpectrum;