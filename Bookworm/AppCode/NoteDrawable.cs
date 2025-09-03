using System;
using System.ComponentModel;

namespace Bookworm.AppCode
{
	// Token: 0x02000048 RID: 72
	public class NoteDrawable : Component
	{
		// Token: 0x06000575 RID: 1397 RVA: 0x0001DCA2 File Offset: 0x0001BEA2
		public NoteDrawable()
		{
			this.InitializeComponent();
		}

		// Token: 0x06000576 RID: 1398 RVA: 0x0001DCB0 File Offset: 0x0001BEB0
		public NoteDrawable(IContainer container)
		{
			container.Add(this);
			this.InitializeComponent();
		}

		// Token: 0x06000577 RID: 1399 RVA: 0x0001DCC5 File Offset: 0x0001BEC5
		protected override void Dispose(bool disposing)
		{
			if (disposing && this.components != null)
			{
				this.components.Dispose();
			}
			base.Dispose(disposing);
		}

		// Token: 0x06000578 RID: 1400 RVA: 0x0001DCE4 File Offset: 0x0001BEE4
		private void InitializeComponent()
		{
			this.components = new Container();
		}

		// Token: 0x04000301 RID: 769
		private IContainer components;
	}
}
