using System.Text.Json.Serialization;

namespace TwoXKOChapterBuilder;

public sealed class VidChopperChapterConfig
{
    [JsonPropertyName("$schema")]
    public string Schema { get; set; } = "https://vidchopper.dev/schemas/chapter-config.schema.json";

    public int Version { get; set; } = 1;
    public VidChopperOutputOptions? Output { get; set; }
    public VidChopperEncoderOptions? Encoder { get; set; }
    public List<VidChopperChapter> Chapters { get; set; } = [];
}

public sealed class VidChopperOutputOptions
{
    public string? Folder { get; set; }
    public string? NamingPattern { get; set; }
}

public sealed class VidChopperEncoderOptions
{
    public int? Crf { get; set; }
    public int? Cq { get; set; }
    public string? Preset { get; set; }
    public int? Threads { get; set; }
}

public sealed class VidChopperChapter
{
    public string Name { get; set; } = string.Empty;
    public object Start { get; set; } = string.Empty;
    public object End { get; set; } = string.Empty;
    public string? OutputName { get; set; }
}

public sealed class MatchChapter
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int Order { get; set; }
    public string Round { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string NameOverride { get; set; } = string.Empty;
    public string OutputNameOverride { get; set; } = string.Empty;
    public string Start { get; set; } = string.Empty;
    public string End { get; set; } = string.Empty;
    public long StartMilliseconds { get; set; }
    public long EndMilliseconds { get; set; }
    public MatchSide Left { get; set; } = new();
    public MatchSide Right { get; set; } = new();

    public override string ToString()
    {
        if (!string.IsNullOrWhiteSpace(NameOverride))
        {
            return $"#{Order:00}  {NameOverride}  ·  {Start}–{End}";
        }

        var round = string.IsNullOrWhiteSpace(Round) ? string.Empty : $"{Round} · ";
        return $"#{Order:00}  {round}{Left.Name} [{Left.Point}/{Left.Assist} · {Left.Fuse}]  vs  " +
               $"{Right.Name} [{Right.Point}/{Right.Assist} · {Right.Fuse}]  ·  {Start}–{End}";
    }
}

public sealed class MatchSide
{
    public string Name { get; set; } = string.Empty;
    public string Point { get; set; } = string.Empty;
    public string Assist { get; set; } = string.Empty;
    public string Fuse { get; set; } = string.Empty;
}
