using System;
using System.CodeDom.Compiler;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Windows;
using System.Windows.Forms;
using System.Windows.Forms.Integration;
using System.Windows.Markup;
using AxWMPLib;

namespace Bookworm
{
	// Token: 0x02000016 RID: 22
	public partial class Player : Window
	{
		// Token: 0x0600010F RID: 271 RVA: 0x00003C3C File Offset: 0x00001E3C
		public Player()
		{
			try
			{
				this.InitializeComponent();
			}
			catch (Exception ex)
			{
				Console.WriteLine(ex.Message);
			}
		}

		// Token: 0x06000110 RID: 272 RVA: 0x00003C94 File Offset: 0x00001E94
		public Player(string url, bool autoStart, int type, string title)
		{
			this.InitializeComponent();
			this._url = url;
			this.Play();
		}

		// Token: 0x06000111 RID: 273 RVA: 0x00003CD0 File Offset: 0x00001ED0
		private void Play()
		{
			try
			{
				this._url = this._url.Replace("/", "\\").Replace("\\\\", "\\");
				this._mediaUrl = this._url;
				if (this._url.Contains(".clsbv01"))
				{
					if (File.Exists(this._url) && File.Exists(this._url.Replace(".clsbv01", ".mp4")))
					{
						File.Delete(this._url.Replace(".clsbv01", ".mp4"));
					}
					if (!File.Exists(this._url.Replace(".clsbv01", ".mp4")))
					{
						File.Move(this._url, Path.ChangeExtension(this._url, ".mp4"));
					}
					if (File.Exists(this._url.Replace(".clsbv01", ".srt")))
					{
						this._url.Replace(".clsbv01", ".srt");
					}
					else if (File.Exists(this._url.Replace(".clsbv01", ".null")))
					{
						string text = this._url.Replace(".clsbv01", ".null");
						File.Move(text, Path.ChangeExtension(text, ".srt"));
						this._url.Replace(".clsbv01", ".srt");
					}
					this._url = this._url.Replace(".clsbv01", ".mp4");
					this.tmpurl = this._url;
				}
				else if (this._url.Contains(".clsbs10"))
				{
					if (File.Exists(this._url) && File.Exists(this._url.Replace(".clsbs10", ".mp3")))
					{
						File.Delete(this._url.Replace(".clsbs10", ".mp3"));
					}
					if (!File.Exists(this._url.Replace(".clsbs10", ".mp3")))
					{
						File.Move(this._url, Path.ChangeExtension(this._url, ".mp3"));
					}
					this._url = this._url.Replace(".clsbs10", ".mp3");
					this.tmpurl = this._url;
				}
				Control child = this.formsHost.Child;
				this.TestMeDia.URL = this.tmpurl;
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x06000112 RID: 274 RVA: 0x00003F50 File Offset: 0x00002150
		private void Window_Closing(object sender, CancelEventArgs e)
		{
			this.TestMeDia.close();
		}

		// Token: 0x0400007E RID: 126
		public string _mediaUrl = "";

		// Token: 0x0400007F RID: 127
		private string tmpurl = "";

		// Token: 0x04000080 RID: 128
		private string _url = string.Empty;
	}
}
